#!/bin/sh
# Usage: scripts/check-version.sh <tag>   Fails unless the tag is v<package.json version>.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
expected="v$(node -p "require('$root/package.json').version")"
if [ "$1" != "$expected" ]; then
  echo "Tag $1 does not match package.json ($expected)" >&2
  exit 1
fi
