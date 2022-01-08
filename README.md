# Prostgles UI

Web dashboard and SQL Editor for Postgres

### Screenshots

[More](https://prostgles.com/ui)
<p float="left">
  <img src="https://prostgles.com/ui-vids/screenshot2.png" width="65%"/>  
  <img src="https://prostgles.com/ui-vids/mobile2.png" width="33%" />  
</p>

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
docker-compose up 
```

By default the app will be accessible at localhost:3004.
To use a custom port (3099 for example):

```
git clone https://github.com/prostgles/ui.git
cd ui
PRGL_DOCKER_PORT=3099 docker-compose up 
```