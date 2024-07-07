#!/bin/bash

cd ui/server

# git stash && git pull && npm i && npm run build
npm i && npm run build

cd -

npm start