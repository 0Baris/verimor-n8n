import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VerimorSmsApi implements ICredentialType {
	name = 'verimorSmsApi';

	displayName = 'Verimor SMS API';

	documentationUrl = 'https://github.com/0Baris/verimor-n8n#credentials';

	icon = 'file:../nodes/Verimor/verimor.svg' as const;

	properties: INodeProperties[] = [
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			required: true,
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
		},
		{
			displayName: 'Default Sender',
			name: 'defaultSender',
			type: 'string',
			default: '',
			description: 'Sender header (source_addr) used when a send does not set one',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://sms.verimor.com.tr',
			description: 'Change only to point at a test server',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				username: '={{$credentials.username}}',
				password: '={{$credentials.password}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/v2/balance',
			method: 'GET',
		},
	};
}
