ORIGINAL=$(npm pkg get version | tr -d '"')

npm version "${ORIGINAL}-dev.$(date +%s)" --no-git-tag-version
npm publish  --access=public --tag dev 

git restore package.json package-lock.json