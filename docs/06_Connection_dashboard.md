<h1 id="connection_dashboard"> Connection dashboard </h1> 

The connection dashboard is your command center for exploring and managing your Postgres database. 
Open tables, run SQL, visualize schema relationships, switch workspaces, and launch tools—all in one flexible, customizable workspace.
With quick search, saved queries, AI-powered assistance, and instant access to every database object, the dashboard gives you a fast, intuitive way to navigate your data and build the tools you need.

## Features

- **Unified workspace**: View tables, SQL editors, charts, and tools together in a flexible layout. Save and switch between different layouts and sets of opened views for different tasks or projects.
- **AI Assistant**: Generate SQL, explore data, and get help directly within the dashboard.
- **Flexible layout**: Drag, resize, and arrange views in a tiled layout to create a workspace that fits your needs.
- **Global search**: Search across all tables, views, and functions in a single, fast search bar.
- **Schema diagram**: Visualize relationships between tables and schemas to better understand your database structure.
- **Import data**: Easily import data from CSV/JSON files into your database tables.

<img src="./screenshots/dashboard.svgif.svg" alt="Connection dashboard" style="border: 1px solid; margin: 1em 0;" />

## Components

### Dashboard elements
- <a href="#dashboard_menu">Dashboard menu</a>: Allows opening tables and views, schema diagram, importing files, managing saved queries, and accessing dashboard settings.  
- **Dashboard menu toggle**: Opens or closes the dashboard menu unless the menu is pinned.  
- **Go to configuration**: Opens the configuration page for the selected connection.  
- **Change connection**: Switch to a different database connection.  
- **Workspaces**: List of available workspaces for the selected connection. Each workspace stores opened views and their layout.  
- <a href="#workspaces_menu">Workspaces menu</a>: Opens the workspaces menu, allowing you to create, manage, and switch between workspaces.  
- <a href="#workspace_area">Workspace area</a>: Main content area of the dashboard, where the tables, views, SQL editors and other visualisations are displayed.  
- <a href="#ai_assistant">AI Assistant</a>: Opens an AI assistant to help generate SQL queries, understand database schema, or perform other tasks.  
- **Feedback**: Opens the feedback form, allowing you to provide feedback about the application.  
- **Go to Connections**: Opens the connections list page.  

<h2 id="dashboard_menu"> Dashboard menu </h2> 

The dashboard menu is the entry point in exploring your database.
The layout adapts to the screen size by pinning the menu to keep it open when there is enough space. 
For wider screens the centered layout mode can be enabled through the settings.

  - **Open an SQL editor**: Opens an SQL editor view in the workspace area.  
  - **Quick search**: Opens the quick search menu for searching across all available tables and views from the current database.  
  - **Settings**: Opens the settings menu for configuring dashboard layout preferences.  
  - **Pin/Unpin menu**: Toggles the pinning of the dashboard menu. Pinned menus remain open until unpinned or accessing from a low width screen.  
  - **Resize menu**: Allows resizing the dashboard menu. Drag to adjust the width of the menu.  
  - **Resize centered layout**: Allows resizing the workspace area when centered layout is enabled. Drag to adjust the width of the centered layout.  
  - **Saved queries**: List of saved queries of the current user from the current workspace. Click to open a saved query.  
  - **Tables and views**: List of tables and views from the current database. Click to open a table or view. By default only the tables from the public schema are shown. Schema list from the connection settings controls which schemas are shown.  
  - **Server-side functions**: List of server-side functions for the current database. Click to open a function.  
  - <a href="#create/import">Create/Import</a>: Opens the menu for creating new tables, server-side functions or importing csv/json files.  
  - <a href="#schema_diagram">Schema diagram</a>: Opens the schema diagram for visualizing the relationships between tables in the current database.  

<h3 id="create/import"> Create/Import </h3> 

Create new tables, server-side functions or import files into the current database.

  - **Create new table**: Opens the form to create a new table in the current database.  
  - <a href="#import_file">Import file</a>: Opens the form to import a file into the current database.  
  - **Create TS Function**: Opens the form to create a new server-side TypeScript function for the current database.  

