'use strict';
// Writes the credentials and workflows that run inside a real n8n container.
const fs = require('node:fs');

const base = 'http://127.0.0.1:8765';
const credentials = [
	{ id: 'smsMock', name: 'Mock SMS', type: 'verimorSmsApi', data: { username: 'mock-user', password: 'mock-pass', defaultSender: 'MOCKSENDER', baseUrl: base } },
	{ id: 'smsRejected', name: 'Rejected SMS', type: 'verimorSmsApi', data: { username: 'rejected-user', password: 'rejected-secret', defaultSender: '', baseUrl: base } },
	{ id: 'switchMock', name: 'Mock Switch', type: 'verimorSwitchApi', data: { apiKey: 'mock-key', baseUrl: base } },
	{ id: 'waMock', name: 'Mock WhatsApp', type: 'verimorWhatsAppApi', data: { apiKey: 'mock-api-key', baseUrl: base } },
];

const trigger = { parameters: {}, id: 'n0', name: 'Start', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0] };
const verimor = (index, name, parameters, [type, id, label]) => ({
	parameters,
	id: `n${index}`,
	name,
	type: 'n8n-nodes-verimor.verimor',
	typeVersion: 1,
	position: [200 * index, 0],
	credentials: { [type]: { id, name: label } },
});
const chain = (id, nodes) => ({
	id,
	name: id,
	active: false,
	settings: {},
	nodes,
	connections: Object.fromEntries(
		nodes.slice(0, -1).map((node, i) => [node.name, { main: [[{ node: nodes[i + 1].name, type: 'main', index: 0 }]] }]),
	),
});

const sms = ['verimorSmsApi', 'smsMock', 'Mock SMS'];
const rejected = ['verimorSmsApi', 'smsRejected', 'Rejected SMS'];
const sw = ['verimorSwitchApi', 'switchMock', 'Mock Switch'];
const wa = ['verimorWhatsAppApi', 'waMock', 'Mock WhatsApp'];

const workflows = [
	chain('verimorActions', [
		trigger,
		verimor(1, 'Send SMS', { resource: 'sms', operation: 'send', destinations: '905001112233', message: 'Merhaba', additionalFields: {} }, sms),
		verimor(2, 'Balance', { resource: 'sms', operation: 'getBalance' }, sms),
		verimor(3, 'Status', { resource: 'sms', operation: 'getStatus', lookUpBy: 'customId', lookUpValue: 'order-42' }, sms),
		verimor(4, 'Originate', { resource: 'switch', operation: 'originate', extension: '101', destination: '905001112233', callFields: {} }, sw),
		verimor(5, 'OTP', { resource: 'whatsapp', operation: 'sendOtp', to: '905001112233', templateName: 'otp', language: 'tr', templateParameters: '123456' }, wa),
		verimor(6, 'Raw Queues', { resource: 'switch', operation: 'rawRequest', operationId: 'getQueues', pathParameters: '{}', queryParameters: '{}', body: '{}' }, sw),
	]),
	chain('verimorListsAndOtp', [
		trigger,
		verimor(1, 'SMS OTP', { resource: 'sms', operation: 'sendOtp', destination: '905001112233', code: '482931', otpFields: {} }, sms),
		verimor(2, 'Bulk', { resource: 'whatsapp', operation: 'sendBulk', recipients: '905001112233, 905004445566', templateName: 'kampanya', language: 'tr', templateParameters: 'Ekim' }, wa),
		verimor(3, 'Call Records', { resource: 'switch', operation: 'getCallRecords', returnAll: true, cdrFilters: {} }, sw),
		// Call Records outputs two items; without executeOnce n8n would list messages once per item.
		{ ...verimor(4, 'Messages', { resource: 'whatsapp', operation: 'getMessages', returnAll: true, messageFilters: {} }, wa), executeOnce: true },
	]),
	chain('verimorRejected', [trigger, verimor(1, 'Balance', { resource: 'sms', operation: 'getBalance' }, rejected)]),
];

fs.writeFileSync(process.argv[2] + '/credentials.json', JSON.stringify(credentials));
fs.writeFileSync(process.argv[2] + '/workflows.json', JSON.stringify(workflows));
