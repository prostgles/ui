#!/bin/bash
set -e

./scripts/check_release_ready.sh pre-tag

branch="$(git rev-parse --abbrev-ref HEAD)"
case "$branch" in
  main|master) ;;
  *) echo "ERROR: Releases must be tagged from main/master, current branch is $branch" >&2; exit 1 ;;
esac

if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: Working tree is not clean" >&2
  git status --short
  exit 1
fi

git fetch origin "$branch" --tags

if ! git diff --quiet "HEAD..origin/$branch"; then
  echo "ERROR: Local $branch is behind origin/$branch" >&2
  exit 1
fi

if ! git diff --quiet "origin/$branch..HEAD"; then
  echo "ERROR: Local $branch has commits not pushed to origin/$branch" >&2
  exit 1
fi

version=$(./scripts/get_version.sh)
tag="v$version"

echo "Releasing version $tag"
git tag -a "$tag" -m "Prostgles UI release $tag"
git push origin "$tag"