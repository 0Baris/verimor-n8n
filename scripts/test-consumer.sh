#!/bin/sh
# Packs the node, installs only the tarball and n8n-workflow into a fresh project, and runs every
# action once against a fake execution context. Nothing reaches the network.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

(cd "$root" && npm pack --pack-destination "$work" >/dev/null)
tarball=$(ls "$work"/n8n-nodes-verimor-*.tgz)
contents=$(tar -tzf "$tarball")
unexpected=$(echo "$contents" | grep -vE '^package/(dist/|package\.json$|README(\.en)?\.md$|LICENSE$)' || true)
if [ -n "$unexpected" ]; then
  echo "Unexpected files in the package:" >&2
  echo "$unexpected" >&2
  exit 1
fi
if tar -xOzf "$tarball" | grep -q "verimor-sdk""-generator"; then
  echo "The package mentions the private generator" >&2
  exit 1
fi

mkdir "$work/consumer"
cd "$work/consumer"
npm init -y >/dev/null
npm install --no-audit --no-fund "$tarball" n8n-workflow >/dev/null
cat > consumer.js <<'JS'
'use strict';
const assert = require('node:assert/strict');
const { Verimor } = require('n8n-nodes-verimor/dist/nodes/Verimor/Verimor.node.js');

const credentials = {
	verimorSmsApi: { username: 'consumer-user', password: 'consumer-pass', defaultSender: 'CONSUMER', baseUrl: 'http://sms.test' },
	verimorSwitchApi: { apiKey: 'consumer-key', baseUrl: 'http://switch.test' },
	verimorWhatsAppApi: { apiKey: 'consumer-api-key', baseUrl: 'http://whatsapp.test' },
};

async function run(parameters, response) {
	const requests = [];
	const ctx = {
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name, _i, fallback) => (name in parameters ? parameters[name] : fallback),
		getCredentials: async (type) => credentials[type],
		getNode: () => ({ id: '1', name: 'Verimor', type: 'n8n-nodes-verimor.verimor', typeVersion: 1, position: [0, 0], parameters: {} }),
		continueOnFail: () => false,
		helpers: { httpRequest: async (request) => (requests.push(request), response) },
	};
	const [[item]] = await new Verimor().execute.call(ctx);
	return { item, request: requests[0] };
}

(async () => {
	const sms = await run(
		{ resource: 'sms', operation: 'send', destinations: '905001112233', message: 'hi', additionalFields: {} },
		{ statusCode: 200, body: '777', headers: {} },
	);
	assert.equal(sms.request.body.source_addr, 'CONSUMER');
	assert.equal(sms.item.json.campaignId, '777');

	const call = await run(
		{ resource: 'switch', operation: 'originate', extension: '101', destination: '905001112233', callFields: {} },
		{ statusCode: 200, body: 'uuid', headers: {} },
	);
	assert.deepEqual(call.request.qs, { key: 'consumer-key' });

	const otp = await run(
		{ resource: 'whatsapp', operation: 'sendOtp', to: '905001112233', templateName: 'otp', language: 'tr', templateParameters: '1' },
		{ statusCode: 202, body: { id: 'a', status: 'queued' }, headers: { 'content-type': 'application/json' } },
	);
	assert.equal(otp.request.headers['x-api-key'], 'consumer-api-key');
	console.log('Installed package consumer passed for SMS, Switch and WhatsApp (n8n).');
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
JS
node consumer.js
