# Prostgles UI

SQL Editor and internal tool builder for Postgres  

[Live demo](https://playground.prostgles.com/)  

### Screenshots

[More](https://prostgles.com/ui)
<p float="left">
  <img src="https://prostgles.com/static/images/screenshot_crypto.png" width="100%%"/>  
</p>

### Features

* SQL Editor with context-aware schema auto-completion and documentation extracts and hints
* Realtime data exploration dashboard with versatile layout system (tab and side-by-side view)
* Table view with controls to view related data, sort, filter and cross-filter
* Map and Time charts with aggregations
* Data insert/update forms with autocomplete
* Role based access control rules
* Isomorphic TypeScript API with schema types, end to end type safety and React hooks
* File upload (locally or to cloud)
* Search all tables from public schema
* Media file display (audio/video/image/html/svg) 
* Data import (CSV, JSON and GeoJSON)
* Backup/Restore (locally or to cloud)
* TypeScript server-side functions (experimental)
* Mobile friendly
* LISTEN NOTIFY support


### Installation - Bootstrap PostgreSQL server and Prostgles altogether

This method is best for learning about the Prostgless.

Download the source code:
```sh
git clone https://github.com/prostgles/ui.git
cd ui
```

Docker setup. By default the app will be accessible at localhost:3004
```sh
docker compose up 
```

To use a custom port (3099 for example) and/or a custom binding address (0.0.0.0 for example):
```sh
PRGL_DOCKER_IP=0.0.0.0 PRGL_DOCKER_PORT=3099 docker compose up 
```

### Installation - use existing PostgreSQL instance

Use this method if you want to get Postgles to work against your existing database

Download the source code:
```
git clone https://github.com/prostgles/ui.git prostgles
cd prostgles
```

Build and run docker image

```sh
$ docker build -t prostgles .
$ docker run -p 3004:3004 -e POSTGRES_DB=bittenman -e POSTGRES_USER=user -e POSTGRES_PASSWORD=password -e PROSTGLES_UI_HOST=0.0.0.0 -e POSTGRES_HOST=192.168.123.1 -e IS_DOCKER=yes -e NODE_ENV=production prostgles

```




### Development

#### 1. Install dependencies:
- [NodeJS](https://nodejs.org/en/download)
- [Postgres](https://www.postgresql.org/download/): For full features **postgresql-15-postgis-3** is recommended

#### 2. Create a database and user for the dashboard, ensuring `.env` has the apropriate values

    sudo su - postgres
    createuser --superuser usr
    psql -c "alter user usr with encrypted password 'psw'"
    createdb db -O usr

#### 3. Start app in dev mode (will install npm packages)

    ./start.sh

### Testing

  Ensure the app is running in development mode and:
  
    cd e2e && npm test-local
