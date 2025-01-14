# export PRGL_DEV_ENV=true && \
npm i && \
npx playwright install && \
npm run setup && \
npx playwright test main.spec.ts --headed