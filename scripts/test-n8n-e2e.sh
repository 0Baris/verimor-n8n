#!/bin/sh
# Packs the node and runs real workflows in a pinned n8n container against a loopback mock.
# Requires Docker; nothing leaves the container.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
image="n8nio/n8n:2.41.5"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

(cd "$root" && npm pack --pack-destination "$work" >/dev/null)
mkdir -p "$work/e2e/test"
cp "$work"/n8n-nodes-verimor-*.tgz "$work/e2e/package.tgz"
cp -R "$root/test/e2e" "$work/e2e/test/e2e"
docker run --rm -v "$work/e2e":/e2e:ro -e N8N_DIAGNOSTICS_ENABLED=false -e N8N_ENCRYPTION_KEY=e2e-only \
  --entrypoint sh "$image" /e2e/test/e2e/run.sh
