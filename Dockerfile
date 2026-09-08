FROM docker:29-cli AS docker-cli

FROM node:24-bookworm-slim AS runtime

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker

# Backup/restore runs in the app container. Match DB.Dockerfile's PostgreSQL 17.
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates lsb-release && \
    install -d /usr/share/postgresql-common/pgdg && \
    curl --fail -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc && \
    echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends postgresql-client-17 && \
    psql --version && pg_dump --version && pg_restore --version && pg_dumpall --version && \
    apt-get purge -y --auto-remove curl lsb-release && \
    rm -rf /var/lib/apt/lists/*

ENV IS_DOCKER=yes

FROM runtime AS ui

WORKDIR /usr/src/app
COPY . .

WORKDIR /usr/src/app/client

RUN npm run build && cd ../server && npm run build

ENV NODE_ENV=production
ENV IS_DOCKER=yes

CMD ["node", "/usr/src/app/server/dist/server/src/index.js"]
