# Prostgles UI

Web dashboard and SQL Editor for Postgres  

[Live demo](https://play.prostgles.com/)  

### Screenshots

[More](https://prostgles.com/ui)
<p float="left">
  <img src="https://prostgles.com/static/images/screenshot_crypto.png" width="100%%"/>  
</p>
<img src="https://prostgles.com/static/images/screenshot_start_commands.png" width="33%" />  

### Features

* SQL Editor with context-aware schema auto-completion and documentation extracts and hints
* Realtime data exploration dashboard with versatile layout system (tab and side-by-side view)
* UI controls to join tables, sort, filter and cross-filter
* Map and Time charts with aggregations
* Data insert/update forms with autocomplete
* Role based access control rules
* Isomorphic TypeScript API with schema types, end to end type safety and React hooks
* File upload (locally or to cloud)
* Search all data/schema
* Media file display (audio/video/image/html/svg) 
* Data import (CSV, JSON and GeoJSON)
* Backup/Restore (locally or to cloud)
* TypeScript server-side functions (experimental)
* Mobile friendly
* LISTEN NOTIFY support


### Installation

Download the source code:
```
git clone https://github.com/prostgles/ui.git
cd ui
```

Docker setup. By default the app will be accessible at localhost:3004
```
docker compose up 
```

To use a custom port (3099 for example) and/or a custom binding address (0.0.0.0 for example):
```
PRGL_DOCKER_IP=0.0.0.0 PRGL_DOCKER_PORT=3099 docker compose up 
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
