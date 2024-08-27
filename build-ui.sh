
#!/bin/bash

rm -rf ./ui/*
mkdir -p ./ui/server/src
mkdir -p ./ui/server/dist
mkdir -p ./ui/server/connection_dbo
mkdir -p ./ui/commonTypes
mkdir -p ./ui/client
mkdir -p ./ui/electron

cp -R ./.github ./ui/

cd ./server
npm run build
cd ..

cp -R ./electron/*.json ./ui/electron/

cp -R ./server/src ./ui/server/
cp -R ./server/dist ./ui/server/
cp -R ./server/sample_schemas ./ui/server/
cp -R ./commonTypes ./ui/
cp ./server/tsconfig.json ./ui/server/
cp ./server/.gitignore ./ui/server/
cp ./server/tslint.json ./ui/server/
cp ./server/LICENSE ./ui/server/
cp ./server/licenses.json ./ui/server/
cp ./server/package.json ./ui/server/
cp ./server/package-lock.json ./ui/server/
cp ./server/build.sh ./ui/server/

cd ./client
npm run build

cd ..

mkdir -p ./ui/client/build
mkdir -p ./ui/client/public
mkdir -p ./ui/client/static

cp -R ./client/* ./ui/client/
rm -rf ./ui/client/node_modules

cp ./docker-compose.yml ./ui/
cp ./LICENSE ./ui/
cp ./README.md ./ui/
cp ./PRIVACY ./ui/
cp ./server/.gitignore ./ui/
cp ./Dockerfile ./ui/
cp ./.env ./ui/

mkdir -p ./ui/.github/ISSUE_TEMPLATE
cp -R ./.github/ISSUE_TEMPLATE ./ui/.github/

mv ./ui ./electron

