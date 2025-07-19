#!/bin/bash

set -e

# Create a process group
# Use PGID to kill all processes in this group when script exits
trap 'kill 0' EXIT

cd server 
npm run dev:electron &

cd ../client 
rm -rf ./build
npm run dev