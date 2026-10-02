#!/bin/sh
# Runs inside the n8n image: installs the packed node like n8n does, starts the mock and executes the workflows.
set -eu
mkdir -p /home/node/.n8n/nodes
cd /home/node/.n8n/nodes
npm init -y >/dev/null
npm install --no-audit --no-fund --legacy-peer-deps --ignore-scripts /e2e/package.tgz >/dev/null
node /e2e/test/e2e/mock.js &
mkdir -p /tmp/fixtures
node /e2e/test/e2e/fixtures.js /tmp/fixtures
cd /home/node
n8n import:credentials --input=/tmp/fixtures/credentials.json >/dev/null 2>&1
n8n import:workflow --input=/tmp/fixtures/workflows.json >/dev/null 2>&1
n8n execute --id=verimorActions --rawOutput >/tmp/actions.json 2>/tmp/actions.err || { cat /tmp/actions.err; exit 1; }
n8n execute --id=verimorRejected --rawOutput >/tmp/rejected.json 2>/tmp/rejected.err || true
n8n execute --id=verimorListsAndOtp --rawOutput >/tmp/lists.json 2>/tmp/lists.err || { cat /tmp/lists.err; exit 1; }
node /e2e/test/e2e/check.js
