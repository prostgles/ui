version=$(grep -m1 '"version":' ./electron/package.json | cut -d '"' -f4)
echo "Releasing version $version"
git tag -a "v$version" -m "v$version"
git push origin "v$version"