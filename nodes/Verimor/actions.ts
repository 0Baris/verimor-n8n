import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { Product } from './operations.gen';
import { callOperation, findOperation } from './transport';

const PAGE_SIZE = 100;

function parseJson(context: IExecuteFunctions, name: string, itemIndex: number): IDataObject {
	const raw = context.getNodeParameter(name, itemIndex, '{}') as string | IDataObject;
	if (typeof raw === 'object' && raw !== null) {
		return raw;
	}
	const text = String(raw).trim();
	if (text === '') {
		return {};
	}
	try {
		const value = JSON.parse(text) as unknown;
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			return value as IDataObject;
		}
	} catch {
		// Reported below.
	}
	throw new NodeOperationError(context.getNode(), `"${name}" must be a JSON object`, { itemIndex });
}

function compact(values: IDataObject): IDataObject {
	return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== ''));
}

function list(text: string): string[] {
	return text
		.split(',')
		.map((value) => value.trim())
		.filter((value) => value !== '');
}

function unexpected(context: IExecuteFunctions, itemIndex: number, what: string): NodeOperationError {
	return new NodeOperationError(context.getNode(), `Verimor returned an unexpected ${what} response`, { itemIndex });
}

/** How many items a "Get Many" action may still return; Infinity when Return All is on. */
function wanted(context: IExecuteFunctions, itemIndex: number): number {
	return context.getNodeParameter('returnAll', itemIndex, false) === true
		? Infinity
		: (context.getNodeParameter('limit', itemIndex, 50) as number);
}

async function rawRequest(context: IExecuteFunctions, itemIndex: number, resource: Product): Promise<INodeExecutionData[]> {
	const target = findOperation(resource, context.getNodeParameter('operationId', itemIndex) as string);
	const body = parseJson(context, 'body', itemIndex);
	const result = await callOperation(context, itemIndex, target, {
		path: parseJson(context, 'pathParameters', itemIndex) as Record<string, string>,
		query: parseJson(context, 'queryParameters', itemIndex),
		body: Object.keys(body).length > 0 || Object.values(target.credentials).includes('body') ? body : undefined,
	});
	if (target.responseKind === 'binary') {
		const binary = await context.helpers.prepareBinaryData(
			Buffer.from(result.body as ArrayBuffer),
			`${target.operationId}.bin`,
		);
		return [{ json: { statusCode: result.statusCode }, binary: { data: binary }, pairedItem: { item: itemIndex } }];
	}
	return [{ json: { statusCode: result.statusCode, body: result.body as IDataObject }, pairedItem: { item: itemIndex } }];
}

async function smsAction(context: IExecuteFunctions, itemIndex: number, operation: string): Promise<IDataObject[] | undefined> {
	if (operation === 'send') {
		const fields = context.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;
		const message = context.getNodeParameter('message', itemIndex) as string;
		const destinations = list(context.getNodeParameter('destinations', itemIndex) as string);
		if (destinations.length === 0) {
			throw new NodeOperationError(context.getNode(), 'At least one destination is required', { itemIndex });
		}
		const body = compact({
			source_addr: fields.sourceAddr as string,
			valid_for: fields.validFor as string,
			send_at: fields.sendAt as string,
			custom_id: fields.customId as string,
			iys_recipient_type: fields.iysRecipientType as string,
			is_commercial: fields.isCommercial === true ? true : undefined,
			messages: destinations.map((dest) => ({ dest, msg: message })),
		});
		const result = await callOperation(context, itemIndex, findOperation('sms', 'sendSmsJson'), { body });
		return [{ campaignId: String(result.body).trim() }];
	}

	if (operation === 'sendOtp') {
		const fields = context.getNodeParameter('otpFields', itemIndex, {}) as IDataObject;
		const code = String(context.getNodeParameter('code', itemIndex, '')).trim();
		const message = String(fields.message ?? '').trim();
		if (code === '' && message === '') {
			throw new NodeOperationError(context.getNode(), 'Set the Code or Message field', { itemIndex });
		}
		if (code === '' && message.includes('{code}')) {
			throw new NodeOperationError(context.getNode(), 'The message uses {code}, so set a Code', { itemIndex });
		}
		const credentials = (await context.getCredentials('verimorSmsApi', itemIndex)) as IDataObject;
		const body = compact({
			dest: context.getNodeParameter('destination', itemIndex) as string,
			code,
			msg: message,
			lang: fields.language as string,
			// OTP names the sender "header"; fall back to the credential's default sender.
			header: String(fields.sender || credentials.defaultSender || ''),
			custom_id: fields.customId as string,
		});
		const result = await callOperation(context, itemIndex, findOperation('sms', 'sendOtp'), { body });
		return [{ campaignId: String(result.body).trim() }];
	}

	if (operation === 'getBalance') {
		const result = await callOperation(context, itemIndex, findOperation('sms', 'get_v2_balance'), {});
		return [{ balance: String(result.body).trim() }];
	}

	if (operation === 'getStatus') {
		const lookUpBy = context.getNodeParameter('lookUpBy', itemIndex) as string;
		const value = context.getNodeParameter('lookUpValue', itemIndex) as string;
		const query = lookUpBy === 'customId' ? { custom_id: value } : { id: value };
		const result = await callOperation(context, itemIndex, findOperation('sms', 'getSmsStatus'), { query });
		if (!Array.isArray(result.body)) {
			throw unexpected(context, itemIndex, 'status');
		}
		return [{ statuses: result.body as IDataObject[] }];
	}

	if (operation === 'getSenderIds') {
		const result = await callOperation(context, itemIndex, findOperation('sms', 'get_v2_headers'), {});
		if (!Array.isArray(result.body)) {
			throw unexpected(context, itemIndex, 'sender ID');
		}
		return (result.body as unknown[]).map((senderId) => ({ senderId: String(senderId) }));
	}

	if (operation === 'getInboundMessages') {
		const filters = context.getNodeParameter('inboundFilters', itemIndex, {}) as IDataObject;
		const query = compact({
			from_time: filters.fromTime as string,
			to_time: filters.toTime as string,
			greater_than: filters.afterMessageId as number,
		});
		const result = await callOperation(context, itemIndex, findOperation('sms', 'get_v2_inbound_messages'), { query });
		if (!Array.isArray(result.body)) {
			throw unexpected(context, itemIndex, 'inbound message');
		}
		return (result.body as IDataObject[]).slice(0, wanted(context, itemIndex));
	}

	return undefined;
}

async function switchAction(context: IExecuteFunctions, itemIndex: number, operation: string): Promise<IDataObject[] | undefined> {
	if (operation === 'originate') {
		const fields = context.getNodeParameter('callFields', itemIndex, {}) as IDataObject;
		const body = compact({
			extension: context.getNodeParameter('extension', itemIndex) as string,
			destination: context.getNodeParameter('destination', itemIndex) as string,
			caller_id: fields.callerId as string,
			manual_answer: fields.manualAnswer === true ? true : undefined,
			timeout: fields.timeout as number,
		});
		const result = await callOperation(context, itemIndex, findOperation('switch', 'originateCallPost'), { body });
		return [{ callId: String(result.body).trim() }];
	}

	if (operation === 'getCallRecords') {
		const filters = context.getNodeParameter('cdrFilters', itemIndex, {}) as IDataObject;
		const filterQuery = compact({
			start_stamp_from: filters.startFrom as string,
			start_stamp_to: filters.startTo as string,
			direction: filters.direction as string,
			missed: typeof filters.missed === 'boolean' ? String(filters.missed) : undefined,
			caller_id_number: filters.callerIdNumber as string,
			destination_number: filters.destinationNumber as string,
			queue: filters.queue as string,
			recording_present: filters.recordingPresent as string,
		});
		const limit = wanted(context, itemIndex);
		const records: IDataObject[] = [];
		for (let page = 1; records.length < limit; page++) {
			const query = { ...filterQuery, page, limit: Math.min(PAGE_SIZE, limit - records.length) };
			const result = await callOperation(context, itemIndex, findOperation('switch', 'getCdrs'), { query });
			const body = result.body as IDataObject;
			if (!body || !Array.isArray(body.cdrs)) {
				throw unexpected(context, itemIndex, 'call record');
			}
			records.push(...(body.cdrs as IDataObject[]));
			const pagination = (body.pagination ?? {}) as IDataObject;
			if (body.cdrs.length === 0 || page >= Number(pagination.total_pages ?? page)) {
				break;
			}
		}
		return records.slice(0, limit);
	}

	return undefined;
}

async function whatsAppAction(context: IExecuteFunctions, itemIndex: number, operation: string): Promise<IDataObject[] | undefined> {
	const send = async (operationId: string, body: IDataObject): Promise<IDataObject[]> => {
		const result = await callOperation(context, itemIndex, findOperation('whatsapp', operationId), { body });
		const response = result.body as IDataObject;
		if (!response || typeof response !== 'object' || !response.id || !response.status) {
			throw unexpected(context, itemIndex, 'message');
		}
		return [response];
	};
	const template = () => ({
		template_name: context.getNodeParameter('templateName', itemIndex) as string,
		language: context.getNodeParameter('language', itemIndex, '') as string,
	});
	const parameters = () => {
		const values = list(context.getNodeParameter('templateParameters', itemIndex, '') as string);
		return values.length > 0 ? values : undefined;
	};

	if (operation === 'sendOtp' || operation === 'sendUtility') {
		const id = operation === 'sendOtp' ? 'send_otp_v1_messages_otp_post' : 'send_utility_v1_messages_utility_post';
		return send(id, compact({ to: context.getNodeParameter('to', itemIndex) as string, ...template(), parameters: parameters() }));
	}

	if (operation === 'sendBulk') {
		const recipients = list(context.getNodeParameter('recipients', itemIndex) as string);
		if (recipients.length === 0) {
			throw new NodeOperationError(context.getNode(), 'At least one recipient is required', { itemIndex });
		}
		const shared = parameters();
		return send(
			'send_bulk_v1_messages_bulk_post',
			compact({ ...template(), recipients: recipients.map((to) => compact({ to, parameters: shared })) }),
		);
	}

	if (operation === 'getMessage') {
		const messageRef = context.getNodeParameter('messageRef', itemIndex) as string;
		const result = await callOperation(
			context,
			itemIndex,
			findOperation('whatsapp', 'get_message_v1_messages__message_ref__get'),
			{ path: { message_ref: messageRef } },
		);
		if (!result.body || typeof result.body !== 'object') {
			throw unexpected(context, itemIndex, 'message');
		}
		return [result.body as IDataObject];
	}

	if (operation === 'getMessages') {
		const filters = context.getNodeParameter('messageFilters', itemIndex, {}) as IDataObject;
		const filterQuery = compact({
			to: filters.to as string,
			wa_message_id: filters.waMessageId as string,
			status: filters.status as string,
			category: filters.category as string,
			template_name: filters.templateName as string,
			since: filters.since as string,
			until: filters.until as string,
		});
		const limit = wanted(context, itemIndex);
		const messages: IDataObject[] = [];
		while (messages.length < limit) {
			const query = { ...filterQuery, offset: messages.length, limit: Math.min(PAGE_SIZE, limit - messages.length) };
			const result = await callOperation(
				context,
				itemIndex,
				findOperation('whatsapp', 'list_messages_v1_messages_get'),
				{ query },
			);
			const body = result.body as IDataObject;
			if (!body || !Array.isArray(body.data)) {
				throw unexpected(context, itemIndex, 'message list');
			}
			messages.push(...(body.data as IDataObject[]));
			if (body.data.length === 0 || messages.length >= Number(body.total ?? messages.length)) {
				break;
			}
		}
		return messages.slice(0, limit);
	}

	return undefined;
}

export async function run(
	context: IExecuteFunctions,
	itemIndex: number,
	resource: Product,
	operation: string,
): Promise<INodeExecutionData[]> {
	if (operation === 'rawRequest') {
		return rawRequest(context, itemIndex, resource);
	}
	const actions = { sms: smsAction, switch: switchAction, whatsapp: whatsAppAction };
	const results = await actions[resource](context, itemIndex, operation);
	if (results === undefined) {
		throw new NodeOperationError(context.getNode(), `Unsupported operation ${resource}.${operation}`, { itemIndex });
	}
	return results.map((json) => ({ json, pairedItem: { item: itemIndex } }));
}
