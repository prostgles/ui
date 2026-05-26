#!/bin/bash
set -euo pipefail

MODE="${1:-pre-tag}" # pre-tag | on-release
VERSION="$(./scripts/get_version.sh)"
TAG="v${VERSION}"
RELEASE_FILE="./releases/${TAG}.md"
COMPOSE_FILE="./docker-compose.yml"

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

echo "Checking release readiness for ${TAG} (mode=${MODE})"

# 1) release notes
[ -f "${RELEASE_FILE}" ] || fail "Missing release notes file: ${RELEASE_FILE}"

# 2) docker image tags in compose
grep -q "image: prostgles/ui:${TAG}" "${COMPOSE_FILE}" || \
  fail "Missing prostgles/ui:${TAG} in ${COMPOSE_FILE}"

grep -q "image: prostgles/ui-db:${TAG}" "${COMPOSE_FILE}" || \
  fail "Missing prostgles/ui-db:${TAG} in ${COMPOSE_FILE}"

if [ "${MODE}" = "pre-tag" ]; then
  # 3a) pre-tag guard: tag must not already exist
  if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
    fail "Tag already exists locally: ${TAG}"
  fi

  if git ls-remote --exit-code --tags origin "refs/tags/${TAG}" >/dev/null 2>&1; then
    fail "Tag already exists on origin: ${TAG}"
  fi
fi

if [ "${MODE}" = "on-release" ]; then
  # 3b) CI guard: pushed tag should match package version
  REF_TAG="${GITHUB_REF_NAME:-}"
  [ -n "${REF_TAG}" ] || fail "GITHUB_REF_NAME is not set"
  [ "${REF_TAG}" = "${TAG}" ] || \
    fail "Pushed tag (${REF_TAG}) does not match package version tag (${TAG})"
fi

echo "All release checks passed for ${TAG}"