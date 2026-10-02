'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { context, load, SECRETS, ALL_SECRETS } = require('./helpers');

const { node, OPERATIONS } = load();
const BASES = { sms: 'http://sms.test', switch: 'http://switch.test', whatsapp: 'http://whatsapp.test' };
const WIRE = { username: 'sms-user', password: 'sms-password', key: 'switch-key', 'x-api-key': 'whatsapp-key' };

test('the generated table lists all 68 operations', () => {
	assert.equal(OPERATIONS.length, 68);
	const count = (product) => OPERATIONS.filter((o) => o.product === product).length;
	assert.deepEqual([count('sms'), count('switch'), count('whatsapp')], [13, 52, 3]);
});

for (const operation of OPERATIONS) {
	test(`raw ${operation.product} ${operation.operationId} reaches ${operation.method} ${operation.path} with its credentials`, async () => {
		const names = [...operation.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
		const pathParameters = JSON.stringify(Object.fromEntries(names.map((name) => [name, 'v 1'])));
		const response =
			operation.responseKind === 'binary'
				? { statusCode: 200, body: new Uint8Array([1, 2]).buffer, headers: { 'content-type': 'application/pdf' } }
				: { statusCode: 200, body: '{}', headers: { 'content-type': 'application/json' } };
		const { ctx, requests } = context(
			{ resource: operation.product, operation: 'rawRequest', operationId: operation.operationId, pathParameters, queryParameters: '{}', body: '{}' },
			[response],
		);
		const [[item]] = await node.execute.call(ctx);

		assert.equal(requests.length, 1);
		const [request] = requests;
		assert.equal(request.method, operation.method);
		const path = operation.path.replace(/\{[^}]+\}/g, 'v%201');
		assert.equal(request.url, BASES[operation.product] + path);
		for (const [field, location] of Object.entries(operation.credentials)) {
			const where = { query: request.qs, header: request.headers, body: request.body }[location];
			assert.equal(where[field], WIRE[field], `${field} in ${location}`);
		}
		if (operation.responseKind === 'binary') {
			assert.equal(request.encoding, 'arraybuffer');
			assert.equal(item.binary.data.data, 'AQI=');
		} else {
			assert.equal(item.json.statusCode, 200);
		}
	});
}

test('an unknown raw operation id fails before any request', async () => {
	const { ctx, requests } = context({ resource: 'sms', operation: 'rawRequest', operationId: 'nope', pathParameters: '{}', queryParameters: '{}', body: '{}' });
	await assert.rejects(node.execute.call(ctx), /Unknown sms operation/);
	assert.equal(requests.length, 0);
});

for (const status of [400, 401, 403, 404, 422, 500, 503]) {
	for (const [kind, body, type] of [
		['json', { message: 'rejected' }, 'application/json'],
		['text', 'rejected', 'text/plain'],
		['empty', '', 'text/plain'],
	]) {
		test(`HTTP ${status} with a ${kind} body becomes a NodeApiError without secrets and without retry`, async () => {
			const { ctx, requests } = context({ resource: 'sms', operation: 'getBalance' }, [{ statusCode: status, body, headers: { 'content-type': type } }]);
			const error = await node.execute.call(ctx).then(
				() => assert.fail('expected an error'),
				(caught) => caught,
			);
			assert.equal(error.constructor.name, 'NodeApiError');
			assert.match(error.message, new RegExp(`HTTP ${status}`));
			const serialized = JSON.stringify({ message: error.message, description: error.description, context: error.context });
			for (const secret of ALL_SECRETS) {
				assert.equal(serialized.includes(secret), false, `${secret} leaked`);
			}
			assert.equal(requests.length, 1);
		});
	}
}

test('continue on fail returns the error as an item', async () => {
	const { ctx } = context({ resource: 'sms', operation: 'getBalance' }, [{ statusCode: 500, body: 'down', headers: {} }], SECRETS, { continueOnFail: true });
	const [[item]] = await node.execute.call(ctx);
	assert.match(item.json.error, /HTTP 500/);
});

test('raw bodies must be JSON objects', async () => {
	const { ctx } = context({ resource: 'switch', operation: 'rawRequest', operationId: 'getQueues', pathParameters: '{}', queryParameters: '{}', body: '[1]' });
	await assert.rejects(node.execute.call(ctx), /must be a JSON object/);
});
