#!/bin/bash

file_path="${1:-./package.json}"
version=$(grep -m1 '"version":' "$file_path" | cut -d '"' -f4)

if [ -z "$version" ]; then
  echo "Version not found in $file_path"
  exit 1
fi

echo "$version"