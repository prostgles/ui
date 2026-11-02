#!/bin/bash

set -e

test_console_log="$PWD/e2e/.test-artifacts/latest-test-console.log"
mkdir -p "$(dirname "$test_console_log")"
if [ -t 1 ] && [ -z "${NO_COLOR+x}" ] && [ -z "${FORCE_COLOR+x}" ]; then
  export FORCE_COLOR=1
fi
exec > >(tee "$test_console_log") 2>&1
echo "Test output saved to $test_console_log"

node ./scripts/check-prostgles-types.mjs

START_SCRIPT_PID=""

teardown_test_server() {
  if [ -n "$START_SCRIPT_PID" ]; then
    kill -9 "$START_SCRIPT_PID" 2>/dev/null || true
    START_SCRIPT_PID=""
  fi
}

trap teardown_test_server EXIT

npm ci --no-audit

# Compile TS to Ensure any errors are caught
cd client
npm ci
npm run tsc
npm run lint

cd ../server
rm -rf ./dist

npm i 
npm run compile
npm run lint
npm run test:compiled

cd ../e2e
npm ci
npm run test:check

# Test cli
cd ../client 
npm run build
node ../server/scripts/preparePackage.mjs
cd ../e2e
npm run test:cli
sleep 3
cd ..

run_e2e_tests() {
  local test_script="$1"
  local test_log_path="$PWD/e2e/.test-artifacts/latest-app-logs.log"

  echo ">>> Running e2e tests: $test_script"

  rm -f ./client/configs/last_compiled.txt
  export PRGL_TEST=true
  export PRGL_TEST_LOG_PATH="$test_log_path"
  rm -f "$test_log_path"
  npm run dev &
  START_SCRIPT_PID=$!

  until [ -f ./client/configs/last_compiled.txt ]
  do
    sleep 1
  done
  echo "UI Compiled"
  sleep 5

  (
    cd e2e
    npm run "$test_script"
  )

  teardown_test_server
}

run_e2e_tests test
