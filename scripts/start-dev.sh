#!/bin/bash

set -e

# Create a process group
# Use PGID to kill all processes in this group when script exits
trap 'kill 0' EXIT

# Install root dev extension tools
npm i --no-audit

cd server 
npm run dev &

cd ../client 
rm -rf ./build
npm run dev