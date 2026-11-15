# export PRGL_DEV_ENV=true && \
npm i && \
npx playwright install && \
npm run setup && \
npm run test:main -- --headed
