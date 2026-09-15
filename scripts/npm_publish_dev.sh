#!/bin/bash
set -e

cd "$(dirname "$0")/../server"

ORIGINAL=$(npm pkg get version | tr -d '"')
restore_version() {
  npm version "$ORIGINAL" --no-git-tag-version --allow-same-version >/dev/null
}
trap restore_version EXIT

npm version "${ORIGINAL}-dev.$(date +%s)" --no-git-tag-version
npm publish --access=public --tag dev
