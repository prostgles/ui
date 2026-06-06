<h1 align="center">
  <div style="margin: auto; width: fit-content; display: flex; flex-direction: row; align-items: center; gap: 10px">
    <a href="https://www.prostgles.com">
        <img src="./electron/icon512.png" height="36" />
        <br>
    </a>
    Prostgles UI
  </div>
</h1>

<p align="center">
  SQL Editor, data explorer and internal tool builder for Postgres
</p>

<p align="center">
  <a href="http://www.prostgles.com"><b>Website</b></a> •
  <a href="https://playground.prostgles.com/"><b>Live demo</b></a> •
  <a href="https://prostgles.com/docs"><b>Documentation</b></a>
</p>

<p float="left">
  <img src="./docs/screenshots/overview.svgif.svg" width="100%" style="border: 1px solid #cecece"/>  
</p>

### Quick start

Install the desktop version using [these instructions](<./docs/03_Installation_(Desktop_Version).md>)

For more information check [docs](./docs/01_Overview.md)

### Features

- SQL Editor with context-aware schema auto-completion and documentation extracts and hints
- AI assistant with MCP support, agentic workflow generation and granular data access permissions
- Data exploration dashboard with customisable grid layout
- Table view with controls to view related data, sort, filter and cross-filter
- Map and Time charts with aggregations and multi-layer support
- Isomorphic TypeScript API with schema types and React hooks support
- File storage (locally or to cloud)
- Global search and command palette
- Media file display (audio/video/image/html/svg)
- Data import (CSV, JSON and GeoJSON)
- Backup/Restore (locally or to cloud)
- TypeScript server-side functions (experimental)

### Installation - Docker compose (recommended)

Download the source code:

```bash
git clone https://github.com/prostgles/ui.git
cd ui
```

Docker setup. By default the app will be accessible at [localhost:3004](http://localhost:3004).
Omit "--build" to use our published images.

```docker-compose.sh
docker compose up -d --build
```

To use a custom port (3099 for example) and/or a custom binding address (0.0.0.0 for example):

```bash
PRGL_DOCKER_IP=0.0.0.0 PRGL_DOCKER_PORT=3099 docker compose up --build
```

To use with docker mcp experimental feature:

```bash
docker compose --profile=docker-mcp up --build
```

### Installation - Desktop version

- To install the pre-built installation files [follow these instructions](<./docs/03_Installation_(Desktop_Version).md>)

- To build the installation files yourself you can [follow these instructions](./electron/README.md)

### Installation - use existing PostgreSQL instance

Use this method if you want to use your existing database to store Prostgles metadata

Download the source code:

```bash
git clone https://github.com/prostgles/ui.git prostgles
cd prostgles
```

Build and run our docker image:

```docker-run.sh
docker build -t prostgles .
docker run --network=host -d -p 127.0.0.1:3004:3004 \
  -e POSTGRES_HOST=127.0.0.1 \
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
- [Postgres](https://www.postgresql.org/download/): For full features **postgresql-17-postgis-3.4** is recommended

#### 2. Create a database and user update `.env`. All prostgles state and metadata will be stored in this database

    sudo su - postgres
    createuser --superuser usr
    psql -c "alter user usr with encrypted password 'psw'"
    createdb db -O usr

#### 3. Start app in dev mode (will install npm packages)

    npm run dev

### Testing

Ensure the app is running in development mode and:

    cd e2e && npm test-local
