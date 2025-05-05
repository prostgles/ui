version=$(grep -m1 '"version":' ./package.json | cut -d '"' -f4)
echo "Releasing version $version"
git tag -a "v$version" -m "v$version"
git push origin "v$version"