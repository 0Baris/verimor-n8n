import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VerimorWhatsAppApi implements ICredentialType {
	name = 'verimorWhatsAppApi';

	displayName = 'Verimor WhatsApp API';

	documentationUrl = 'https://github.com/0Baris/verimor-n8n#credentials';

	icon = 'file:../nodes/Verimor/verimor.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://wapi.verimor.com.tr',
			description: 'Change only to point at a test server',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'x-api-key': '={{$credentials.apiKey}}',
			},
		},
	};

	// WhatsApp has no authenticated endpoint without side effects, so this checks reachability only.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/health',
			method: 'GET',
		},
	};
}
