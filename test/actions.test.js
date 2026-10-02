'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { context, load } = require('./helpers');

const { node } = load();

test('SMS send posts the wire fields with the credential and the default sender', async () => {
	const { ctx, requests } = context(
		{ resource: 'sms', operation: 'send', destinations: '905001112233, 905004445566', message: 'Merhaba', additionalFields: {} },
		[{ statusCode: 200, body: '12345', headers: { 'content-type': 'text/plain' } }],
	);
	const [[item]] = await node.execute.call(ctx);

	assert.equal(requests.length, 1);
	const [request] = requests;
	assert.equal(request.method, 'POST');
	assert.equal(request.url, 'http://sms.test/v2/send.json');
	assert.deepEqual(request.body, {
		username: 'sms-user',
		password: 'sms-password',
		source_addr: 'DEFSENDER',
		messages: [
			{ dest: '905001112233', msg: 'Merhaba' },
			{ dest: '905004445566', msg: 'Merhaba' },
		],
	});
	assert.deepEqual(request.qs, {});
	assert.equal(request.timeout, 30000);
	assert.equal(request.ignoreHttpStatusErrors, true);
	assert.deepEqual(item.json, { campaignId: '12345' });
});

test('a per-message sender beats the default sender, and no sender is sent when neither is set', async () => {
	const withSender = context({
		resource: 'sms', operation: 'send', destinations: '905001112233', message: 'x', additionalFields: { sourceAddr: 'CALL' },
	});
	await node.execute.call(withSender.ctx);
	assert.equal(withSender.requests[0].body.source_addr, 'CALL');

	const credentials = { verimorSmsApi: { username: 'u', password: 'p', defaultSender: '', baseUrl: 'http://sms.test' } };
	const none = context({ resource: 'sms', operation: 'send', destinations: '905001112233', message: 'x', additionalFields: {} }, [], credentials);
	await node.execute.call(none.ctx);
	assert.equal('source_addr' in none.requests[0].body, false);
});

test('SMS balance and status put the credentials in the query', async () => {
	const balance = context({ resource: 'sms', operation: 'getBalance' }, [{ statusCode: 200, body: '42.50', headers: {} }]);
	const [[balanceItem]] = await node.execute.call(balance.ctx);
	assert.equal(balance.requests[0].url, 'http://sms.test/v2/balance');
	assert.deepEqual(balance.requests[0].qs, { username: 'sms-user', password: 'sms-password' });
	assert.deepEqual(balanceItem.json, { balance: '42.50' });

	const status = context(
		{ resource: 'sms', operation: 'getStatus', lookUpBy: 'customId', lookUpValue: 'order-42' },
		[{ statusCode: 200, body: '[{"status":"DELIVERED"}]', headers: { 'content-type': 'application/json' } }],
	);
	const [[statusItem]] = await node.execute.call(status.ctx);
	assert.deepEqual(status.requests[0].qs, { custom_id: 'order-42', username: 'sms-user', password: 'sms-password' });
	assert.deepEqual(statusItem.json, { statuses: [{ status: 'DELIVERED' }] });
});

test('a status body that is not a list is rejected', async () => {
	const { ctx } = context(
		{ resource: 'sms', operation: 'getStatus', lookUpBy: 'id', lookUpValue: '1' },
		[{ statusCode: 200, body: 'not json', headers: { 'content-type': 'text/plain' } }],
	);
	await assert.rejects(node.execute.call(ctx), /unexpected status response/);
});

test('Switch originate sends the key in the query and the call in the body', async () => {
	const { ctx, requests } = context(
		{ resource: 'switch', operation: 'originate', extension: '101', destination: '905001112233', callFields: { callerId: '902120000000' } },
		[{ statusCode: 200, body: 'call-uuid', headers: {} }],
	);
	const [[item]] = await node.execute.call(ctx);
	assert.equal(requests[0].method, 'POST');
	assert.equal(requests[0].url, 'http://switch.test/originate');
	assert.deepEqual(requests[0].qs, { key: 'switch-key' });
	assert.deepEqual(requests[0].body, { extension: '101', destination: '905001112233', caller_id: '902120000000' });
	assert.deepEqual(item.json, { callId: 'call-uuid' });
});

for (const [operation, path] of [['sendOtp', '/v1/messages/otp'], ['sendUtility', '/v1/messages/utility']]) {
	test(`WhatsApp ${operation} sends the API key header and validates the 202 body`, async () => {
		const accepted = { id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', status: 'queued' };
		const { ctx, requests } = context(
			{ resource: 'whatsapp', operation, to: '905001112233', templateName: 'otp', language: 'tr', templateParameters: '123456, x' },
			[{ statusCode: 202, body: accepted, headers: { 'content-type': 'application/json' } }],
		);
		const [[item]] = await node.execute.call(ctx);
		assert.equal(requests[0].url, `http://whatsapp.test${path}`);
		assert.deepEqual(requests[0].headers, { 'x-api-key': 'whatsapp-key' });
		assert.deepEqual(requests[0].qs, {});
		assert.deepEqual(requests[0].body, { to: '905001112233', template_name: 'otp', language: 'tr', parameters: ['123456', 'x'] });
		assert.deepEqual(item.json, accepted);
	});
}

test('an incomplete WhatsApp 202 body is rejected', async () => {
	const { ctx } = context(
		{ resource: 'whatsapp', operation: 'sendOtp', to: '905001112233', templateName: 'otp', language: 'tr', templateParameters: '' },
		[{ statusCode: 202, body: { status: 'queued' }, headers: { 'content-type': 'application/json' } }],
	);
	await assert.rejects(node.execute.call(ctx), /unexpected message response/);
});

test('text responses are requested as text so n8n does not parse them as numbers', async () => {
	// Real n8n parses "42.50" into 42.5 (and loses precision on long IDs) unless text is requested.
	const balance = context({ resource: 'sms', operation: 'getBalance' });
	await node.execute.call(balance.ctx);
	assert.equal(balance.requests[0].encoding, 'text');

	const send = context({ resource: 'sms', operation: 'send', destinations: '905001112233', message: 'x', additionalFields: {} });
	await node.execute.call(send.ctx);
	assert.equal(send.requests[0].encoding, 'text');

	const status = context(
		{ resource: 'sms', operation: 'getStatus', lookUpBy: 'id', lookUpValue: '1' },
		[{ statusCode: 200, body: '[]', headers: { 'content-type': 'application/json' } }],
	);
	await node.execute.call(status.ctx);
	assert.equal(status.requests[0].encoding, undefined);
});
