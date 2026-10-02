import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { run } from './actions';
import { OPERATIONS, type Product } from './operations.gen';

const SEND_WARNING =
	'Each execution sends a real message or call and may cost money. Keep "Retry On Fail" off unless duplicates are acceptable.';

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
						name: 'Get Many Inbound Messages',
						value: 'getInboundMessages',
						action: 'Get many inbound SMS messages',
					},
					{
						name: 'Get Many Sender IDs',
						value: 'getSenderIds',
						action: 'Get many SMS senders',
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
					{
						name: 'Send OTP',
						value: 'sendOtp',
						action: 'Send a one time password by SMS',
						description: 'Send a verification code to one number',
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
						name: 'Get Many Call Records',
						value: 'getCallRecords',
						action: 'Get many call records',
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
						name: 'Get Many Messages',
						value: 'getMessages',
						action: 'Get many whats app messages',
					},
					{
						name: 'Get Message',
						value: 'getMessage',
						action: 'Get a whats app message',
					},
					{
						name: 'Send Bulk Message',
						value: 'sendBulk',
						action: 'Send a template to many numbers',
						description: 'Queue one template for up to 10,000 recipients',
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
					show: {
						resource: ['sms', 'switch', 'whatsapp'],
						operation: ['send', 'sendOtp', 'originate', 'sendUtility', 'sendBulk'],
					},
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

			// SMS: send OTP
			{
				displayName: 'Destination',
				name: 'destination',
				type: 'string',
				required: true,
				default: '',
				placeholder: '905001112233',
				description: 'One phone number in international format',
				displayOptions: { show: { resource: ['sms'], operation: ['sendOtp'] } },
			},
			{
				displayName: 'Code',
				name: 'code',
				type: 'string',
				default: '',
				placeholder: '482931',
				description: 'The verification code. Required unless you set a Message without {code}.',
				displayOptions: { show: { resource: ['sms'], operation: ['sendOtp'] } },
			},
			{
				displayName: 'Additional Fields',
				name: 'otpFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['sms'], operation: ['sendOtp'] } },
				options: [
					{
						displayName: 'Custom ID',
						name: 'customId',
						type: 'string',
						default: '',
						description: 'Your own reference, usable later with Get Status',
					},
					{
						displayName: 'Language',
						name: 'language',
						type: 'options',
						options: [
							{ name: 'English', value: 'en' },
							{ name: 'Turkish', value: 'tr' },
						],
						default: 'tr',
						description: 'Language of the built-in message template; ignored when you set a Message',
					},
					{
						displayName: 'Message',
						name: 'message',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'Your own text instead of the template; {code} is replaced with the code',
					},
					{
						displayName: 'Sender (Header)',
						name: 'sender',
						type: 'string',
						default: '',
						description: 'Overrides the default sender of the credential for this message',
					},
				],
			},

			// Shared by every "Get Many" action
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: { show: { operation: ['getInboundMessages', 'getCallRecords', 'getMessages'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				displayOptions: {
					show: { operation: ['getInboundMessages', 'getCallRecords', 'getMessages'], returnAll: [false] },
				},
			},

			// SMS: inbound messages
			{
				displayName: 'Filters',
				name: 'inboundFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { resource: ['sms'], operation: ['getInboundMessages'] } },
				options: [
					{
						displayName: 'After Message ID',
						name: 'afterMessageId',
						type: 'number',
						default: 0,
						description: 'Only messages with a larger ID, useful for polling',
					},
					{
						displayName: 'From Time',
						name: 'fromTime',
						type: 'string',
						default: '',
						placeholder: '2026-10-01 00:00:00',
					},
					{
						displayName: 'To Time',
						name: 'toTime',
						type: 'string',
						default: '',
						placeholder: '2026-10-02 00:00:00',
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

			// Switch: call records
			{
				displayName: 'Filters',
				name: 'cdrFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { resource: ['switch'], operation: ['getCallRecords'] } },
				options: [
					{
						displayName: 'Caller ID Number',
						name: 'callerIdNumber',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Destination Number',
						name: 'destinationNumber',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Direction',
						name: 'direction',
						type: 'string',
						default: '',
						description: 'Call direction as Verimor reports it, for example inbound or outbound',
					},
					{
						displayName: 'Missed Only',
						name: 'missed',
						type: 'boolean',
						default: false,
						description: 'Whether to return only missed calls (on) or only answered calls (off)',
					},
					{
						displayName: 'Queue',
						name: 'queue',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Recording',
						name: 'recordingPresent',
						type: 'options',
						options: [
							{ name: 'Deleted', value: 'deleted' },
							{ name: 'Has Recording', value: 'true' },
							{ name: 'No Recording', value: 'false' },
						],
						default: 'true',
					},
					{
						displayName: 'Started After',
						name: 'startFrom',
						type: 'string',
						default: '',
						placeholder: '2026-10-01 00:00:00',
					},
					{
						displayName: 'Started Before',
						name: 'startTo',
						type: 'string',
						default: '',
						placeholder: '2026-10-02 00:00:00',
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
				displayName: 'Recipients',
				name: 'recipients',
				type: 'string',
				required: true,
				default: '',
				placeholder: '905001112233, 905004445566',
				description: 'Phone numbers in international format, separated by commas (up to 10,000)',
				displayOptions: { show: { resource: ['whatsapp'], operation: ['sendBulk'] } },
			},
			{
				displayName: 'Template Name',
				name: 'templateName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['whatsapp'], operation: ['sendOtp', 'sendUtility', 'sendBulk'] } },
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: 'tr',
				displayOptions: { show: { resource: ['whatsapp'], operation: ['sendOtp', 'sendUtility', 'sendBulk'] } },
			},
			{
				displayName: 'Template Parameters',
				name: 'templateParameters',
				type: 'string',
				default: '',
				description: 'Values for the template placeholders, separated by commas; Send Bulk Message uses the same values for every recipient',
				displayOptions: { show: { resource: ['whatsapp'], operation: ['sendOtp', 'sendUtility', 'sendBulk'] } },
			},

			// WhatsApp: message lookups
			{
				displayName: 'Message Reference',
				name: 'messageRef',
				type: 'string',
				required: true,
				default: '',
				description: 'The message ID returned when sending, or the WhatsApp message ID',
				displayOptions: { show: { resource: ['whatsapp'], operation: ['getMessage'] } },
			},
			{
				displayName: 'Filters',
				name: 'messageFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { resource: ['whatsapp'], operation: ['getMessages'] } },
				options: [
					{
						displayName: 'Category',
						name: 'category',
						type: 'options',
						options: [
							{ name: 'Bulk', value: 'bulk' },
							{ name: 'Chat', value: 'chat' },
							{ name: 'OTP', value: 'otp' },
							{ name: 'Utility', value: 'utility' },
						],
						default: 'otp',
					},
					{
						displayName: 'Since',
						name: 'since',
						type: 'dateTime',
						default: '',
						description: 'Messages created at or after this time',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{ name: 'Delivered', value: 'delivered' },
							{ name: 'Failed', value: 'failed' },
							{ name: 'Pending', value: 'pending' },
							{ name: 'Read', value: 'read' },
							{ name: 'Sent', value: 'sent' },
						],
						default: 'delivered',
					},
					{
						displayName: 'Template Name',
						name: 'templateName',
						type: 'string',
						default: '',
					},
					{
						displayName: 'To',
						name: 'to',
						type: 'string',
						default: '',
						placeholder: '905001112233',
					},
					{
						displayName: 'Until',
						name: 'until',
						type: 'dateTime',
						default: '',
						description: 'Messages created before this time',
					},
					{
						displayName: 'WhatsApp Message ID',
						name: 'waMessageId',
						type: 'string',
						default: '',
					},
				],
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
