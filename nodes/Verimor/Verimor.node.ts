import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { OPERATIONS, type Product } from './operations.gen';
import { callOperation, findOperation } from './transport';

const SEND_WARNING =
	'Each execution sends a real message or call and may cost money. Keep "Retry On Fail" off unless duplicates are acceptable.';

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

/** Keeps n8n errors as they are and wraps anything else, so the UI shows the item and context. */
function asNodeError(
	context: IExecuteFunctions,
	error: unknown,
	itemIndex: number,
): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError || error instanceof NodeOperationError) {
		return error;
	}
	return new NodeOperationError(context.getNode(), error as Error, { itemIndex });
}

export class Verimor implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Verimor',
		name: 'verimor',
		icon: { light: 'file:verimor.svg', dark: 'file:verimor.dark.svg' },
		group: ['output'],
		version: [1],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Send SMS, start Switch calls and send WhatsApp templates with Verimor (unofficial)',
		defaults: {
			name: 'Verimor',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{ name: 'verimorSmsApi', required: true, displayOptions: { show: { resource: ['sms'] } } },
			{ name: 'verimorSwitchApi', required: true, displayOptions: { show: { resource: ['switch'] } } },
			{
				name: 'verimorWhatsAppApi',
				required: true,
				displayOptions: { show: { resource: ['whatsapp'] } },
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'SMS', value: 'sms' },
					{ name: 'Switch', value: 'switch' },
					{ name: 'WhatsApp', value: 'whatsapp' },
				],
				default: 'sms',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['sms'] } },
				options: [
					{
						name: 'Advanced: Raw Request',
						value: 'rawRequest',
						action: 'Send a raw SMS API request',
						description: 'Call any SMS operation directly',
					},
					{
						name: 'Get Balance',
						value: 'getBalance',
						action: 'Get the SMS balance',
					},
					{
						name: 'Get Status',
						value: 'getStatus',
						action: 'Get SMS delivery status',
					},
					{
						name: 'Send',
						value: 'send',
						action: 'Send an SMS',
					},
				],
				default: 'send',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['switch'] } },
				options: [
					{
						name: 'Advanced: Raw Request',
						value: 'rawRequest',
						action: 'Send a raw switch API request',
						description: 'Call any Switch operation directly',
					},
					{
						name: 'Originate Call',
						value: 'originate',
						action: 'Start a call',
					},
				],
				default: 'originate',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['whatsapp'] } },
				options: [
					{
						name: 'Advanced: Raw Request',
						value: 'rawRequest',
						action: 'Send a raw whats app API request',
						description: 'Call any WhatsApp operation directly',
					},
					{
						name: 'Send OTP',
						value: 'sendOtp',
						action: 'Send a one time password template',
					},
					{
						name: 'Send Utility Message',
						value: 'sendUtility',
						action: 'Send a utility template',
					},
				],
				default: 'sendOtp',
			},

			// SMS: send
			{
				displayName: SEND_WARNING,
				name: 'sendNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: { resource: ['sms', 'switch', 'whatsapp'], operation: ['send', 'originate', 'sendOtp', 'sendUtility'] },
				},
			},
			{
				displayName: 'Destinations',
				name: 'destinations',
				type: 'string',
				required: true,
				default: '',
				placeholder: '905001112233',
				description: 'Phone numbers in international format; separate several with commas',
				displayOptions: { show: { resource: ['sms'], operation: ['send'] } },
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				typeOptions: { rows: 4 },
				required: true,
				default: '',
				displayOptions: { show: { resource: ['sms'], operation: ['send'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['sms'], operation: ['send'] } },
				options: [
					{
						displayName: 'Custom ID',
						name: 'customId',
						type: 'string',
						default: '',
						description: 'Your own reference, usable later with Get Status',
					},
					{
						displayName: 'Is Commercial',
						name: 'isCommercial',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'IYS Recipient Type',
						name: 'iysRecipientType',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Send At',
						name: 'sendAt',
						type: 'string',
						default: '',
						description: 'Scheduled time, for example 2026-10-02 18:30:00',
					},
					{
						displayName: 'Sender (Source Address)',
						name: 'sourceAddr',
						type: 'string',
						default: '',
						description: 'Overrides the default sender of the credential for this message',
					},
					{
						displayName: 'Valid For',
						name: 'validFor',
						type: 'string',
						default: '',
						placeholder: '48:00',
					},
				],
			},

			// SMS: status
			{
				displayName: 'Look Up By',
				name: 'lookUpBy',
				type: 'options',
				options: [
					{ name: 'Campaign ID', value: 'id' },
					{ name: 'Custom ID', value: 'customId' },
				],
				default: 'id',
				displayOptions: { show: { resource: ['sms'], operation: ['getStatus'] } },
			},
			{
				displayName: 'Value',
				name: 'lookUpValue',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['sms'], operation: ['getStatus'] } },
			},

			// Switch: originate
			{
				displayName: 'Extension',
				name: 'extension',
				type: 'string',
				required: true,
				default: '',
				placeholder: '101',
				displayOptions: { show: { resource: ['switch'], operation: ['originate'] } },
			},
			{
				displayName: 'Destination',
				name: 'destination',
				type: 'string',
				required: true,
				default: '',
				placeholder: '905001112233',
				displayOptions: { show: { resource: ['switch'], operation: ['originate'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'callFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['switch'], operation: ['originate'] } },
				options: [
					{
						displayName: 'Caller ID',
						name: 'callerId',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Manual Answer',
						name: 'manualAnswer',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						default: 30,
					},
				],
			},

			// WhatsApp: templates
			{
				displayName: 'To',
				name: 'to',
				type: 'string',
				required: true,
				default: '',
				placeholder: '905001112233',
				displayOptions: { show: { resource: ['whatsapp'], operation: ['sendOtp', 'sendUtility'] } },
			},
			{
				displayName: 'Template Name',
				name: 'templateName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['whatsapp'], operation: ['sendOtp', 'sendUtility'] } },
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: 'tr',
				displayOptions: { show: { resource: ['whatsapp'], operation: ['sendOtp', 'sendUtility'] } },
			},
			{
				displayName: 'Template Parameters',
				name: 'templateParameters',
				type: 'string',
				default: '',
				description: 'Values for the template placeholders, separated by commas',
				displayOptions: { show: { resource: ['whatsapp'], operation: ['sendOtp', 'sendUtility'] } },
			},

			// Advanced: raw request
			{
				displayName:
					'Advanced: sends exactly the request you describe. Write operations act on your Verimor account and may cost money.',
				name: 'rawNotice',
				type: 'notice',
				default: '',
				displayOptions: { show: { operation: ['rawRequest'] } },
			},
			{
				displayName: 'Operation Name or ID',
				name: 'operationId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getOperations', loadOptionsDependsOn: ['resource'] },
				required: true,
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { operation: ['rawRequest'] } },
			},
			{
				displayName: 'Path Parameters',
				name: 'pathParameters',
				type: 'json',
				default: '{}',
				description: 'Values for {placeholders} in the path, for example {"ID": "123"}',
				displayOptions: { show: { operation: ['rawRequest'] } },
			},
			{
				displayName: 'Query Parameters',
				name: 'queryParameters',
				type: 'json',
				default: '{}',
				displayOptions: { show: { operation: ['rawRequest'] } },
			},
			{
				displayName: 'Body',
				name: 'body',
				type: 'json',
				default: '{}',
				description: 'JSON body; leave {} for operations without a body',
				displayOptions: { show: { operation: ['rawRequest'] } },
			},
		],
	};

	methods = {
		loadOptions: {
			async getOperations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const product = this.getCurrentNodeParameter('resource') as Product;
				return OPERATIONS.filter((operation) => operation.product === product)
					.map((operation) => ({
						name: `${operation.method} ${operation.path} (${operation.identity})`,
						value: operation.operationId,
					}))
					.sort((a, b) => a.name.localeCompare(b.name));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as Product;
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				returnData.push(...(await run(this, itemIndex, resource, operation)));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: itemIndex } });
					continue;
				}
				throw asNodeError(this, error, itemIndex);
			}
		}

		return [returnData];
	}
}

async function run(
	context: IExecuteFunctions,
	itemIndex: number,
	resource: Product,
	operation: string,
): Promise<INodeExecutionData[]> {
	const item = (json: IDataObject): INodeExecutionData[] => [{ json, pairedItem: { item: itemIndex } }];

	if (operation === 'rawRequest') {
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
		return item({ statusCode: result.statusCode, body: result.body as IDataObject });
	}

	if (resource === 'sms' && operation === 'send') {
		const fields = context.getNodeParameter('additionalFields', itemIndex, {}) as IDataObject;
		const message = context.getNodeParameter('message', itemIndex) as string;
		const destinations = (context.getNodeParameter('destinations', itemIndex) as string)
			.split(',')
			.map((value) => value.trim())
			.filter((value) => value !== '');
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
		return item({ campaignId: String(result.body).trim() });
	}

	if (resource === 'sms' && operation === 'getBalance') {
		const result = await callOperation(context, itemIndex, findOperation('sms', 'get_v2_balance'), {});
		return item({ balance: String(result.body).trim() });
	}

	if (resource === 'sms' && operation === 'getStatus') {
		const lookUpBy = context.getNodeParameter('lookUpBy', itemIndex) as string;
		const value = context.getNodeParameter('lookUpValue', itemIndex) as string;
		const query = lookUpBy === 'customId' ? { custom_id: value } : { id: value };
		const result = await callOperation(context, itemIndex, findOperation('sms', 'getSmsStatus'), { query });
		if (!Array.isArray(result.body)) {
			throw new NodeOperationError(context.getNode(), 'Verimor returned an unexpected status response', {
				itemIndex,
			});
		}
		return item({ statuses: result.body as IDataObject[] });
	}

	if (resource === 'switch' && operation === 'originate') {
		const fields = context.getNodeParameter('callFields', itemIndex, {}) as IDataObject;
		const body = compact({
			extension: context.getNodeParameter('extension', itemIndex) as string,
			destination: context.getNodeParameter('destination', itemIndex) as string,
			caller_id: fields.callerId as string,
			manual_answer: fields.manualAnswer === true ? true : undefined,
			timeout: fields.timeout as number,
		});
		const result = await callOperation(context, itemIndex, findOperation('switch', 'originateCallPost'), { body });
		return item({ callId: String(result.body).trim() });
	}

	if (resource === 'whatsapp' && (operation === 'sendOtp' || operation === 'sendUtility')) {
		const parameters = (context.getNodeParameter('templateParameters', itemIndex, '') as string)
			.split(',')
			.map((value) => value.trim())
			.filter((value) => value !== '');
		const body = compact({
			to: context.getNodeParameter('to', itemIndex) as string,
			template_name: context.getNodeParameter('templateName', itemIndex) as string,
			language: context.getNodeParameter('language', itemIndex, '') as string,
			parameters: parameters.length > 0 ? parameters : undefined,
		});
		const id = operation === 'sendOtp' ? 'send_otp_v1_messages_otp_post' : 'send_utility_v1_messages_utility_post';
		const result = await callOperation(context, itemIndex, findOperation('whatsapp', id), { body });
		const response = result.body as IDataObject;
		if (!response || typeof response !== 'object' || !response.id || !response.status) {
			throw new NodeOperationError(context.getNode(), 'Verimor returned an unexpected message response', {
				itemIndex,
			});
		}
		return item(response);
	}

	throw new NodeOperationError(context.getNode(), `Unsupported operation ${resource}.${operation}`, { itemIndex });
}
