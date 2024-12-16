# Prostgles UI

SQL Editor and internal tool builder for Postgres

[Live demo](https://playground.prostgles.com/)

### Screenshots

[More](https://prostgles.com/ui)

<p float="left">
  <img src="https://prostgles.com/static/images/screenshot_crypto.png" width="100%%"/>  
</p>

### Features

- SQL Editor with context-aware schema auto-completion and documentation extracts and hints
- Realtime data exploration dashboard with versatile layout system (tab and side-by-side view)
- Table view with controls to view related data, sort, filter and cross-filter
- Map and Time charts with aggregations
- Data insert/update forms with autocomplete
- Role based access control rules
- Isomorphic TypeScript API with schema types, end to end type safety and React hooks
- File upload (locally or to cloud)
- Search all tables from public schema
- Media file display (audio/video/image/html/svg)
- Data import (CSV, JSON and GeoJSON)
- Backup/Restore (locally or to cloud)
- TypeScript server-side functions (experimental)
- Mobile friendly
- LISTEN NOTIFY support

### Installation - Docker compose (recommended)

Download the source code:

```sh
git clone https://github.com/prostgles/ui.git
cd ui
```

Docker setup. By default the app will be accessible at [localhost:3004](http://localhost:3004)

```sh
docker compose up
```

To use a custom port (3099 for example) and/or a custom binding address (0.0.0.0 for example):

```sh
PRGL_DOCKER_IP=0.0.0.0 PRGL_DOCKER_PORT=3099 docker compose up
```

### Installation - use existing PostgreSQL instance

Use this method if you want to use your existing database to store Prostgles metadata

Download the source code:

```sh
git clone https://github.com/prostgles/ui.git prostgles
cd prostgles
```

Build and run our docker image (172.17.0.1 is used to connect to localhost):

```docker-run.sh
docker build -t prostgles .
docker run -d -p 127.0.0.1:3004:3004 \
  -e POSTGRES_HOST=172.17.0.1 \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_DB=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e PROSTGLES_UI_HOST=0.0.0.0 \
  -e IS_DOCKER=yes \
  -e NODE_ENV=production \
  prostgles

```

Your server will be running on [localhost:3004](http://localhost:3004).

### Development

#### 1. Install dependencies:

- [NodeJS](https://nodejs.org/en/download)
- [Postgres](https://www.postgresql.org/download/): For full features **postgresql-15-postgis-3** is recommended

#### 2. Create a database and user update `.env`. All prostgles state and metadata will be stored in this database

    sudo su - postgres
    createuser --superuser usr
    psql -c "alter user usr with encrypted password 'psw'"
    createdb db -O usr

#### 3. Start app in dev mode (will install npm packages)

    ./start.sh

### Testing

Ensure the app is running in development mode and:

    cd e2e && npm test-local
