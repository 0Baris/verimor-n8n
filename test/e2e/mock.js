'use strict';
// Loopback-only stand-in for the Verimor APIs; logs every request as one JSON line.
const http = require('node:http');
const fs = require('node:fs');

http
	.createServer((req, res) => {
		let body = '';
		req.on('data', (chunk) => (body += chunk));
		req.on('end', () => {
			const url = new URL(req.url, 'http://127.0.0.1');
			fs.appendFileSync(
				'/tmp/requests.log',
				JSON.stringify({ method: req.method, path: url.pathname, query: url.search, apiKey: req.headers['x-api-key'] || null, body }) + '\n',
			);
			if (url.searchParams.get('username') === 'rejected-user') {
				res.writeHead(401, { 'content-type': 'application/json' });
				return res.end('{"message":"invalid credentials"}');
			}
			const routes = {
				'/v2/send.json': [200, 'text/plain', '12345678901234567890'],
				'/v2/balance': [200, 'text/plain', '42.50'],
				'/v2/status': [200, 'application/json', '[{"message_id":1,"status":"DELIVERED"}]'],
				'/originate': [200, 'text/plain', 'call-uuid'],
				'/v1/messages/otp': [202, 'application/json', '{"id":"3f2504e0-4f89-41d3-9a0c-0305e82c3301","status":"queued"}'],
				'/queues': [200, 'application/json', '[{"number":"100","name":"Sales"}]'],
			};
			const [status, type, text] = routes[url.pathname] || [404, 'application/json', '{"message":"no route"}'];
			res.writeHead(status, { 'content-type': type });
			res.end(text);
		});
	})
	.listen(8765, '127.0.0.1');
