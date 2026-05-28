#!/bin/bash
set -euo pipefail

TAG="${1:-}"
COMPOSE_FILE="${2:-./docker-compose.yml}"

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

[ -n "${TAG}" ] || fail "Usage: $0 <vX.Y.Z> [docker-compose.yml]"
[[ "${TAG}" =~ ^v[0-9]+(\.[0-9]+){2}([-+][0-9A-Za-z.-]+)?$ ]] || \
  fail "Docker image tag must look like vX.Y.Z, got: ${TAG}"
[ -f "${COMPOSE_FILE}" ] || fail "Missing compose file: ${COMPOSE_FILE}"

sed -i -E \
  -e "s#image: prostgles/ui:v[0-9]+(\\.[0-9]+){2}([-+][0-9A-Za-z.-]+)?#image: prostgles/ui:${TAG}#g" \
  -e "s#image: prostgles/ui-db:v[0-9]+(\\.[0-9]+){2}([-+][0-9A-Za-z.-]+)?#image: prostgles/ui-db:${TAG}#g" \
  "${COMPOSE_FILE}"

grep -q "image: prostgles/ui:${TAG}" "${COMPOSE_FILE}" || \
  fail "Failed to update prostgles/ui image tag in ${COMPOSE_FILE}"

grep -q "image: prostgles/ui-db:${TAG}" "${COMPOSE_FILE}" || \
  fail "Failed to update prostgles/ui-db image tag in ${COMPOSE_FILE}"

echo "Updated Docker image tags in ${COMPOSE_FILE} to ${TAG}"
