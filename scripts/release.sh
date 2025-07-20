#!/bin/bash

suffix="$1"
version=$(./get_version.sh)
tag="v$version$suffix"

echo "Releasing version $tag"
git tag -a "$tag" -m "Prostgles UI release $tag"
git push origin "$tag"