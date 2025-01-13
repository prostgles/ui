
cd client
npx tsc
cd ..

cat ./client/configs/last_compiled.txt
rm -f ./client/configs/last_compiled.txt
PRGL_TEST=true ./start.sh &

until [ -f ./client/configs/last_compiled.txt ]
do
  sleep 1
done
echo "UI Compiled"
sleep 3
cd e2e && npm test
