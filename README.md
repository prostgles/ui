# Prostgles UI

Web dashboard and SQL Editor for Postgres  

[Live demo](https://play.prostgles.com/)  

### Screenshots

[More](https://prostgles.com/ui)
<p float="left">
  <img src="https://prostgles.com/ui-vids/screenshot2.png" width="100%%"/>  
</p>
<img src="https://prostgles.com/ui-vids/mobile2.png" width="33%" />  

### Features

* SQL Editor with schema auto-completion and useful hints
* Data edit and exploration dashboard
* Sorting, Filtering and Cross-Filtering joined tables
* Search with field and searchterm auto-completion
* Multimedia (audio/video/image) display
* HTML display
* SVG display
* Data import (CSV, JSON and GeoJSON)
* Realtime data
* Customiseable layout. Tab and side-by-side view
* Functions and Aggregations
* Map and Time charts with aggregations
* PostGIS support
* Mobile friendly
* LISTEN NOTIFY support


### Installation

```
git clone https://github.com/prostgles/ui.git
cd ui
docker compose up 
```

By default the app will be accessible at localhost:3004.
To use a custom port (3099 for example) and/or a custom binding address (0.0.0.0 for example):

```
git clone https://github.com/prostgles/ui.git
cd ui
PRGL_DOCKER_IP=0.0.0.0 PRGL_DOCKER_PORT=3099 docker compose up 
```

### Development

#### 1. Install dependencies:
- [NodeJS](https://nodejs.org/en/download)
- [Postgres](https://www.postgresql.org/download/): For full features **postgresql-15-postgis-3** is recommended

#### 2. Create a database and user for the dashboard, ensuring `.env` has the apropriate values

    sudo su - postgres

    createuser --superuser usr
    psql -c "alter user usr with password 'psw'"
    createdb db -O usr

#### 3. Start app in dev mode (will install npm packages)

    ./start.sh

### Testing

  Ensure the app is running in development mode and:
  
    cd e2e && npm test-local