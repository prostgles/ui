#!/bin/bash
cd client
npm run build
cd ../server
npm run build

npm run test-server 2>&1 ./server.log
npm run test-client
