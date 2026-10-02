'use strict';

// A minimal stand-in for n8n's IExecuteFunctions: parameters per name, credentials per type,
// and an httpRequest spy. It never opens a network connection.
const SECRETS = {
	verimorSmsApi: { username: 'sms-user', password: 'sms-password', defaultSender: 'DEFSENDER', baseUrl: 'http://sms.test' },
	verimorSwitchApi: { apiKey: 'switch-key', baseUrl: 'http://switch.test' },
	verimorWhatsAppApi: { apiKey: 'whatsapp-key', baseUrl: 'http://whatsapp.test' },
};

function context(parameters, responses = [], credentials = SECRETS, options = {}) {
	const requests = [];
	const queue = [...responses];
	const ctx = {
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name, _index, fallback) =>
			Object.prototype.hasOwnProperty.call(parameters, name) ? parameters[name] : fallback,
		getCredentials: async (type) => ({ ...credentials[type] }),
		getNode: () => ({ id: '1', name: 'Verimor', type: 'n8n-nodes-verimor.verimor', typeVersion: 1, position: [0, 0], parameters: {} }),
		continueOnFail: () => options.continueOnFail === true,
		helpers: {
			httpRequest: async (request) => {
				requests.push(request);
				return queue.length > 0 ? queue.shift() : { statusCode: 200, body: 'ok', headers: { 'content-type': 'text/plain' } };
			},
			prepareBinaryData: async (buffer, fileName) => ({ data: buffer.toString('base64'), fileName }),
		},
	};
	return { ctx, requests };
}

function load() {
	const { Verimor } = require('../dist/nodes/Verimor/Verimor.node.js');
	const { OPERATIONS } = require('../dist/nodes/Verimor/operations.gen.js');
	return { node: new Verimor(), OPERATIONS };
}

const ALL_SECRETS = ['sms-user', 'sms-password', 'switch-key', 'whatsapp-key'];

module.exports = { context, load, SECRETS, ALL_SECRETS };
