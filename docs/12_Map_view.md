<h1 id="map_view"> Map view </h1> 

The map view allows you to visualize geographical data from your database.
It requires the [PostGIS](https://postgis.net/) extension to be installed on your PostgreSQL database.
It can display points, lines, and polygons based on geometry or geography columns in your tables or views.
It supports multiple layers, custom basemaps, and various map controls for interaction.

<picture>
<source srcset="/screenshots/dark/map.svg" media="(prefers-color-scheme: dark)" />
<img src="/screenshots/map.svg" alt="Map view screenshot" style="border: 1px solid; margin: 1em 0;" />
</picture>

  - **View header**: Contains menu button, title and window minimise/fullscreen controls.  
    - **View title. Drag to re-arrange layout**: Shows the table/view name together with the geometry/geography column name used for the map visualization.  
    - **Collapse the view**: Collapses the view, minimizing it to temporarily save space on the dashboard.   
    - **Fullscreen**: Expands the view to fill the entire screen.  
    - **Close view**: Closes the view.  
    - **Chart toolbar**: Toolbar for the chart view if not detached. By default, newly charts added will appear over the originating table/sql editor view. They can be detached to a separate window.  
      - **Chart menu**: Menu for the chart view.  
      - **Collapse chart**: Collapses the chart window, minimizing it to save space on the dashboard. It can then be restored by clicking the chart icon in the SQL editor top left quick actions section.  
      - **Detach chart**: Detaches the chart from the parent view, allowing it to be moved and resized independently. It keeps the connection the originating table view to cross filter it.  
      - **Close chart**: Closes the chart view, returning to the originatine table/sql editor view.  
    - <a href="#map_view_menu">Map view menu</a>: Data refresh and display options.  
  - <a href="#map_window_with_controls">Map window with controls</a>: Map visualization and controls for interacting with the map.  

<h4 id="map_view_menu"> Map view menu </h4> 

The map view menu provides options for configuring the map visualization, including data refresh, basemap settings, and layer management.

  - **Data refresh**: Allows setting subscriptions or data refresh rates. By default every table subscribes to data changes.  
  - **Basemap**: Allows setting the map tiles and projection.  
    - **Projection**: Allows setting the map projection: Mercator (default) or Orthographic (allows a setting custom tile image for plan drawings).  
  - **Layers**: Allows setting the map layers data source and style. The map supports multiple layers.  
  - **Settings**: Allows setting the map layout options: aggregation limit, click behavior, etc.  

<h4 id="map_window_with_controls"> Map window with controls </h4> 

The map window contains the map visualization and controls for interacting with the map.
It allows you to add layers, set the map extent behavior, and toggle cursor coordinates display.

  - **Map layer manager**: Allows adding/removing layers to the map. Each layer can be configured with its own data source and style.  
    - **Add layer**: Allows adding a new layer to the map. The available options are all the tables that have geometry or geography columns.  
    - **Add OSM layer**: Allows adding a new layer based on OpenStreetMap data. This is useful for displaying additional map data like roads, restaurants, etc.  
    - **Map basemap options**: Allows setting the map tiles and projection.  
    - **Map opacity options**: Allows setting the opacity of the map layers.  
  - **Show cursor coordinates**: Toggle displays the current cursor coordinates on the map.   
  - **Map extent behavior**: Allows setting the map extent and auto-zoom behavior: Follow data, Follow map or Free roam.  
  - **Zoom to data**: Zooms the map to fit the bounds of the data currently displayed.  
  - **Add new feature**: Allows drawing and inserting a new feature: Point, Line or Polygon.  

