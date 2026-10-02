'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('the package is a community node with no runtime dependencies', () => {
	assert.ok(pkg.name.startsWith('n8n-nodes-'));
	assert.ok(pkg.keywords.includes('n8n-community-node-package'));
	assert.equal(pkg.dependencies, undefined);
	assert.deepEqual(pkg.files, ['dist', '!dist/tsconfig.tsbuildinfo']);
});

test('every node and credential listed in package.json is built', () => {
	for (const file of [...pkg.n8n.nodes, ...pkg.n8n.credentials]) {
		assert.ok(fs.existsSync(path.join(root, file)), file);
	}
});

test('the built code never reads environment variables or the file system', () => {
	const files = fs.readdirSync(path.join(root, 'dist'), { recursive: true }).filter((file) => String(file).endsWith('.js'));
	for (const file of files) {
		const source = fs.readFileSync(path.join(root, 'dist', String(file)), 'utf8');
		assert.equal(/process\.env|require\(["']fs["']\)|require\(["']node:fs["']\)/.test(source), false, String(file));
	}
});
