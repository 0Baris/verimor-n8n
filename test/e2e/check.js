'use strict';
// Checks n8n's execution output and the requests the mock received.
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => {
	const text = fs.readFileSync(file, 'utf8');
	return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
};
const outputs = (run) =>
	Object.fromEntries(
		Object.entries(run.data.resultData.runData).map(([name, runs]) => [name, runs[0].data?.main?.[0]?.[0]?.json]),
	);

const actions = read('/tmp/actions.json');
assert.equal(actions.data.resultData.error, undefined, 'the action workflow must succeed');
assert.deepEqual(outputs(actions), {
	Start: {},
	'Send SMS': { campaignId: '12345678901234567890' },
	Balance: { balance: '42.50' },
	Status: { statuses: [{ message_id: 1, status: 'DELIVERED' }] },
	Originate: { callId: 'call-uuid' },
	OTP: { id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', status: 'queued' },
	'Raw Queues': { statusCode: 200, body: [{ number: '100', name: 'Sales' }] },
});

const requests = fs.readFileSync('/tmp/requests.log', 'utf8').trim().split('\n').map((line) => JSON.parse(line));
const sent = JSON.parse(requests.find((r) => r.path === '/v2/send.json').body);
assert.deepEqual(sent, {
	messages: [{ dest: '905001112233', msg: 'Merhaba' }],
	password: 'mock-pass',
	username: 'mock-user',
	source_addr: 'MOCKSENDER',
});
assert.equal(requests.find((r) => r.path === '/originate').query, '?key=mock-key');
assert.equal(requests.find((r) => r.path === '/v1/messages/otp').apiKey, 'mock-api-key');

const rejectedText = fs.readFileSync('/tmp/rejected.json', 'utf8');
const rejected = read('/tmp/rejected.json');
assert.match(String(rejected.data.resultData.error?.message), /HTTP 401: invalid credentials/);
assert.equal(rejectedText.includes('rejected-secret'), false, 'the execution data must not contain the password');
assert.equal(requests.filter((r) => r.query.includes('rejected-user')).length, 1, 'a rejected call is not retried');
console.log('Real n8n run passed for SMS, Switch, WhatsApp, raw access and a rejected call.');
