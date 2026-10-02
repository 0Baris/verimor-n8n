import type { IDataObject, IExecuteFunctions, IHttpRequestOptions, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { DEFAULT_BASE_URLS, OPERATIONS, type Product, type VerimorOperation } from './operations.gen';

export const CREDENTIAL_TYPES: Record<Product, string> = {
	sms: 'verimorSmsApi',
	switch: 'verimorSwitchApi',
	whatsapp: 'verimorWhatsAppApi',
};

const SENDER_FIELD = 'source_addr';
const TIMEOUT_MS = 30_000;
const MAX_SUMMARY = 200;

export interface CallParts {
	path?: Record<string, string | number>;
	query?: IDataObject;
	body?: IDataObject;
}

export interface CallResult {
	statusCode: number;
	body: unknown;
	headers: IDataObject;
}

export function findOperation(product: Product, operationId: string): VerimorOperation {
	const operation = OPERATIONS.find((item) => item.product === product && item.operationId === operationId);
	if (!operation) {
		throw new Error(`Unknown ${product} operation: ${operationId}`);
	}
	return operation;
}

function secrets(product: Product, credentials: IDataObject): Record<string, string> {
	if (product === 'sms') {
		return { username: String(credentials.username ?? ''), password: String(credentials.password ?? '') };
	}
	if (product === 'switch') {
		return { key: String(credentials.apiKey ?? '') };
	}
	return { 'x-api-key': String(credentials.apiKey ?? '') };
}

function missingOrEmpty(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}

function expandPath(template: string, values: Record<string, string | number>): string {
	let path = template;
	for (const [name, value] of Object.entries(values)) {
		path = path.split(`{${name}}`).join(encodeURIComponent(String(value)));
	}
	if (path.includes('{')) {
		throw new Error(`A path value is missing for ${template}`);
	}
	return path;
}

function summarize(body: unknown): string {
	if (body === undefined || body === null || body === '') {
		return '';
	}
	if (typeof body === 'object') {
		for (const field of ['message', 'detail', 'error', 'msg']) {
			const value = (body as IDataObject)[field];
			if (typeof value === 'string') {
				return value.slice(0, MAX_SUMMARY);
			}
		}
		return JSON.stringify(body).slice(0, MAX_SUMMARY);
	}
	return String(body).trim().slice(0, MAX_SUMMARY);
}

/**
 * Sends one Verimor operation once. Credentials and the default SMS sender are placed where the
 * shared contract says; errors carry only the status and body, never the request URL or secrets.
 */
export async function callOperation(
	context: IExecuteFunctions,
	itemIndex: number,
	operation: VerimorOperation,
	parts: CallParts,
): Promise<CallResult> {
	const credentials = (await context.getCredentials(
		CREDENTIAL_TYPES[operation.product],
		itemIndex,
	)) as IDataObject;
	const values = secrets(operation.product, credentials);
	const query: IDataObject = { ...(parts.query ?? {}) };
	const headers: IDataObject = {};
	let body: IDataObject | undefined = parts.body ? { ...parts.body } : undefined;

	for (const [field, location] of Object.entries(operation.credentials)) {
		if (location === 'query' && missingOrEmpty(query[field])) {
			query[field] = values[field];
		} else if (location === 'header') {
			headers[field] = values[field];
		} else if (location === 'body') {
			body = body ?? {};
			if (missingOrEmpty(body[field])) {
				body[field] = values[field];
			}
		}
	}

	const sender = String(credentials.defaultSender ?? '');
	if (sender && operation.senderLocation === 'query' && missingOrEmpty(query[SENDER_FIELD])) {
		query[SENDER_FIELD] = sender;
	} else if (sender && operation.senderLocation === 'body') {
		body = body ?? {};
		if (missingOrEmpty(body[SENDER_FIELD])) {
			body[SENDER_FIELD] = sender;
		}
	}

	const baseUrl = String(credentials.baseUrl || DEFAULT_BASE_URLS[operation.product]).replace(/\/+$/, '');
	const options: IHttpRequestOptions = {
		method: operation.method,
		url: baseUrl + expandPath(operation.path, parts.path ?? {}),
		qs: query,
		headers,
		timeout: TIMEOUT_MS,
		ignoreHttpStatusErrors: true,
		returnFullResponse: true,
	};
	if (body !== undefined) {
		options.body = body;
		options.json = true;
	}
	if (operation.responseKind === 'binary') {
		options.encoding = 'arraybuffer';
	} else if (operation.responseKind === 'text') {
		// Without this n8n parses "42.50" into 42.5 and long numeric IDs lose precision.
		options.encoding = 'text';
	}

	const response = (await context.helpers.httpRequest(options)) as {
		statusCode: number;
		body: unknown;
		headers: IDataObject;
	};
	let parsed = response.body;
	if (typeof parsed === 'string' && /json/i.test(String(response.headers?.['content-type'] ?? ''))) {
		try {
			parsed = JSON.parse(parsed);
		} catch {
			// Keep the text; the action decides whether that is acceptable.
		}
	}
	if (response.statusCode < 200 || response.statusCode > 299) {
		const summary = summarize(parsed);
		const message = summary
			? `Verimor API returned HTTP ${response.statusCode}: ${summary}`
			: `Verimor API returned HTTP ${response.statusCode}`;
		throw new NodeApiError(
			context.getNode(),
			{ statusCode: response.statusCode, body: summary } as JsonObject,
			{ message, httpCode: String(response.statusCode), itemIndex },
		);
	}
	return { statusCode: response.statusCode, body: parsed, headers: response.headers ?? {} };
}
