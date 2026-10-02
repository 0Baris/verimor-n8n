'use strict';

// Runs every workflow under examples/ through the node with the mock context: each one must
// send exactly the request its manifest entry documents.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { context, load, SECRETS } = require('./helpers');

const { node } = load();
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'examples/manifest.json'), 'utf8'));
const pathPattern = (template) =>
	new RegExp(`^${template.split(/\{[^}]+\}/).map((part) => part.replace(/[.*+?^$()|[\]\\]/g, '\\$&')).join('[^/]+')}$`);

test('the examples cover every action and every operation once', () => {
	const { OPERATIONS } = load();
	const raw = manifest.filter((entry) => entry.operationId).map((entry) => `${entry.product}/${entry.operationId}`);
	assert.deepEqual(raw.sort(), OPERATIONS.map((operation) => `${operation.product}/${operation.operationId}`).sort());
	assert.equal(manifest.filter((entry) => entry.action).length, 13);
});

for (const entry of manifest) {
	test(`${entry.file} sends ${entry.method} ${entry.path}`, async () => {
		const workflow = JSON.parse(fs.readFileSync(path.join(root, entry.file), 'utf8'));
		const verimor = workflow.nodes.find((item) => item.type === 'n8n-nodes-verimor.verimor');
		const { ctx, requests } = context(verimor.parameters, [
			{ statusCode: 418, body: { detail: 'recorded' }, headers: { 'content-type': 'application/json' } },
		]);
		await node.execute.call(ctx).catch(() => undefined);

		assert.equal(requests.length, 1);
		const url = new URL(requests[0].url);
		assert.equal(requests[0].method, entry.method);
		assert.equal(url.origin, new URL(SECRETS[Object.keys(verimor.credentials)[0]].baseUrl).origin);
		assert.match(url.pathname, pathPattern(entry.path));
	});
}
