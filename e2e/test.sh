set -e

# Ensure any ts errors are caught
cd client
npx tsc
cd ../server
npx tsc

cd ..

rm -f ./client/configs/last_compiled.txt
PRGL_TEST=true ./start.sh &
START_SCRIPT_PID=$!

until [ -f ./client/configs/last_compiled.txt ]
do
  sleep 1
done
echo "UI Compiled"
sleep 3
cd e2e && npm test
kill $START_SCRIPT_PID
