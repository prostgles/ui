set -e

# Ensure any ts errors are caught
cd client
npx tsc
cd ../server
npx tsc

cd ..

rm -f ./client/configs/last_compiled.txt
PRGL_TEST=true ./scripts/start.sh &
START_SCRIPT_PID=$!

# Ensure the process is killed even if the script exits early (e.g., due to set -e or Ctrl+C)
trap 'echo ">>> Cleaning up process ./start.sh $START_SCRIPT_PID"; kill -9 $START_SCRIPT_PID 2>/dev/null' EXIT

until [ -f ./client/configs/last_compiled.txt ]
do
  sleep 1
done
echo "UI Compiled"
sleep 3
cd e2e && npm test 
