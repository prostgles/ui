#!/bin/bash
set -e

./scripts/check_release_ready.sh pre-tag

version=$(./scripts/get_version.sh)
tag="v$version"

echo "Releasing version $tag"
git tag -a "$tag" -m "Prostgles UI release $tag"
git push origin "$tag"