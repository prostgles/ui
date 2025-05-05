FROM node:20-slim AS base

WORKDIR /usr/src/app


COPY . .

# Install latest pg_dump (psql v17) to ensure backup/restore works
RUN apt-get update && \
    apt-get install -y --no-install-recommends gnupg wget ca-certificates lsb-release && \ 
    apt-get upgrade -y && \
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'  && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
    apt-get update && \
    apt-get install -y --no-install-recommends postgresql-client-17 && \
    pg_dump --version && \
    psql --version && \
    # Clean up
    apt-get clean && \
    apt-get purge -y --auto-remove gnupg wget lsb-release && \
    rm -rf /var/lib/apt/lists/*

FROM base AS deps 

WORKDIR /usr/src/app/client

RUN npm run build && cd ../server && npm run build

ENV NODE_ENV=production
ENV IS_DOCKER=yes

CMD ["node", "/usr/src/app/server/dist/server/src/index.js"]