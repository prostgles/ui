#!/bin/bash

version=$(./scripts/get_version.sh)
tag="v$version"

echo "Releasing version $tag"
git tag -a "$tag" -m "Prostgles UI release $tag"
git push origin "$tag"