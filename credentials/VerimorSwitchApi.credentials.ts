import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VerimorSwitchApi implements ICredentialType {
	name = 'verimorSwitchApi';

	displayName = 'Verimor Switch API';

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
			default: 'https://api.bulutsantralim.com',
			description: 'Change only to point at a test server',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				key: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/queues',
			method: 'GET',
		},
	};
}
