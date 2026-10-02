'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { context, load } = require('./helpers');

const { node } = load();
const json = (body, statusCode = 200) => ({ statusCode, body, headers: { 'content-type': 'application/json' } });
const text = (body) => ({ statusCode: 200, body, headers: { 'content-type': 'text/plain' } });
const items = (output) => output[0].map((item) => item.json);

test('SMS send OTP posts one destination with the code and uses the default sender as header', async () => {
	const { ctx, requests } = context(
		{ resource: 'sms', operation: 'sendOtp', destination: '905001112233', code: '482931', otpFields: { language: 'en' } },
		[text('987654321')],
	);
	const output = await node.execute.call(ctx);

	assert.equal(requests[0].method, 'POST');
	assert.equal(requests[0].url, 'http://sms.test/v2/otp');
	assert.deepEqual(requests[0].body, {
		username: 'sms-user',
		password: 'sms-password',
		dest: '905001112233',
		code: '482931',
		lang: 'en',
		header: 'DEFSENDER',
	});
	assert.equal(requests[0].encoding, 'text');
	assert.deepEqual(items(output), [{ campaignId: '987654321' }]);
});

test('SMS send OTP needs a code or a message and checks {code} usage', async () => {
	const missing = context({ resource: 'sms', operation: 'sendOtp', destination: '905001112233', code: '', otpFields: {} });
	await assert.rejects(node.execute.call(missing.ctx), /Code or Message/);
	assert.equal(missing.requests.length, 0);

	const placeholder = context({
		resource: 'sms', operation: 'sendOtp', destination: '905001112233', code: '', otpFields: { message: 'Kod: {code}' },
	});
	await assert.rejects(node.execute.call(placeholder.ctx), /\{code\}/);

	const custom = context(
		{ resource: 'sms', operation: 'sendOtp', destination: '905001112233', code: '1', otpFields: { message: 'Kod: {code}', sender: 'ACME' } },
		[text('1')],
	);
	await node.execute.call(custom.ctx);
	assert.equal(custom.requests[0].body.msg, 'Kod: {code}');
	assert.equal(custom.requests[0].body.header, 'ACME');
});

test('SMS sender IDs become one item each', async () => {
	const { ctx, requests } = context({ resource: 'sms', operation: 'getSenderIds' }, [json(['ACME', 'VERIMOR'])]);
	const output = await node.execute.call(ctx);

	assert.equal(requests[0].url, 'http://sms.test/v2/headers');
	assert.deepEqual(items(output), [{ senderId: 'ACME' }, { senderId: 'VERIMOR' }]);
});

test('SMS inbound messages map filters and honour the limit', async () => {
	const messages = [{ message_id: 1 }, { message_id: 2 }, { message_id: 3 }];
	const { ctx, requests } = context(
		{
			resource: 'sms',
			operation: 'getInboundMessages',
			returnAll: false,
			limit: 2,
			inboundFilters: { fromTime: '2026-10-01 00:00:00', afterMessageId: 7 },
		},
		[json(messages)],
	);
	const output = await node.execute.call(ctx);

	assert.equal(requests[0].url, 'http://sms.test/v2/inbound_messages');
	assert.equal(requests[0].qs.from_time, '2026-10-01 00:00:00');
	assert.equal(requests[0].qs.greater_than, 7);
	assert.deepEqual(items(output), messages.slice(0, 2));
});

test('Switch call records page through every page when Return All is on', async () => {
	const { ctx, requests } = context(
		{ resource: 'switch', operation: 'getCallRecords', returnAll: true, cdrFilters: { direction: 'inbound', missed: true } },
		[
			json({ cdrs: [{ call_uuid: 'a' }], pagination: { page: 1, total_pages: 2, limit: 100 } }),
			json({ cdrs: [{ call_uuid: 'b' }], pagination: { page: 2, total_pages: 2, limit: 100 } }),
		],
	);
	const output = await node.execute.call(ctx);

	assert.deepEqual(requests.map((request) => request.qs.page), [1, 2]);
	assert.equal(requests[0].qs.direction, 'inbound');
	assert.equal(requests[0].qs.missed, 'true');
	assert.equal(requests[0].qs.key, 'switch-key');
	assert.deepEqual(items(output), [{ call_uuid: 'a' }, { call_uuid: 'b' }]);
});

test('Switch call records stop at the limit', async () => {
	const { ctx, requests } = context(
		{ resource: 'switch', operation: 'getCallRecords', returnAll: false, limit: 1, cdrFilters: {} },
		[json({ cdrs: [{ call_uuid: 'a' }, { call_uuid: 'b' }], pagination: { page: 1, total_pages: 5 } })],
	);
	const output = await node.execute.call(ctx);

	assert.equal(requests.length, 1);
	assert.equal(requests[0].qs.limit, 1);
	assert.deepEqual(items(output), [{ call_uuid: 'a' }]);
});

test('WhatsApp bulk send builds one recipient per number with shared parameters', async () => {
	const { ctx, requests } = context(
		{
			resource: 'whatsapp',
			operation: 'sendBulk',
			recipients: '905001112233, 905004445566',
			templateName: 'kampanya',
			language: 'tr',
			templateParameters: 'Ekim, %20',
		},
		[json({ id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', status: 'queued', task_id: 't-1' }, 202)],
	);
	const output = await node.execute.call(ctx);

	assert.equal(requests[0].url, 'http://whatsapp.test/v1/messages/bulk');
	assert.equal(requests[0].headers['x-api-key'], 'whatsapp-key');
	assert.deepEqual(requests[0].body, {
		template_name: 'kampanya',
		language: 'tr',
		recipients: [
			{ to: '905001112233', parameters: ['Ekim', '%20'] },
			{ to: '905004445566', parameters: ['Ekim', '%20'] },
		],
	});
	assert.equal(items(output)[0].status, 'queued');
});

test('WhatsApp get message encodes the reference into the path', async () => {
	const { ctx, requests } = context(
		{ resource: 'whatsapp', operation: 'getMessage', messageRef: 'wamid/1' },
		[json({ id: 'x', status: 'delivered' })],
	);
	const output = await node.execute.call(ctx);

	assert.equal(requests[0].url, 'http://whatsapp.test/v1/messages/wamid%2F1');
	assert.deepEqual(items(output), [{ id: 'x', status: 'delivered' }]);
});

test('WhatsApp messages page by offset until the total is reached', async () => {
	const { ctx, requests } = context(
		{ resource: 'whatsapp', operation: 'getMessages', returnAll: true, messageFilters: { status: 'failed' } },
		[
			json({ data: [{ id: '1' }, { id: '2' }], total: 3, limit: 100, offset: 0 }),
			json({ data: [{ id: '3' }], total: 3, limit: 100, offset: 2 }),
		],
	);
	const output = await node.execute.call(ctx);

	assert.deepEqual(requests.map((request) => request.qs.offset), [0, 2]);
	assert.equal(requests[0].qs.limit, 100);
	assert.equal(requests[0].qs.status, 'failed');
	assert.deepEqual(items(output), [{ id: '1' }, { id: '2' }, { id: '3' }]);
});

test('list actions reject a response without the documented list', async () => {
	const { ctx } = context({ resource: 'whatsapp', operation: 'getMessages', returnAll: true, messageFilters: {} }, [json({ total: 1 })]);
	await assert.rejects(node.execute.call(ctx), /unexpected/);
});
