#!/bin/bash

file_path="${1:-./package.json}"
version=$(grep -m1 '"version":' "$file_path" | cut -d '"' -f4)
echo "$version"