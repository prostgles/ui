<h1 id="schema_graph"> Schema graph </h1> 

The schema graph provides a visual representation of the relationships between tables and views in the current database.
It allows you to explore the schema structure, view table relationships, and manage the layout of the schema graph.
You can filter tables and columns based on their relationship types, reset the layout, and close the schema graph to return to the dashboard menu.

<picture>
<source srcset="/screenshots/dark/schema_diagram.svg" media="(prefers-color-scheme: dark)" />
<img src="/screenshots/schema_diagram.svg" alt="Schema graph screenshot" style="border: 1px solid; margin: 1em 0;" />
</picture>

  - **Top controls**: Controls for managing the schema graph view and layout.  
    - **Table relationship filter**: Display tables based on their relationship type. Options include: all, linked (with relationships), orphaned (without relationships).  
    - **Column relationship filter**: Display columns based on their relationship type. Options include: all, references (with relationships), none (no columns/only table names will be shown).  
    - **Link colour mode**: Colour links by: default (fixed colour), root table (the colour of the table the relationship tree originates from), on-delete/on-update (colour based on constraint referential action).  
    - **Reset layout**: Moving tables is persisted the state database. Clicking this resets the schema graph layout to its initial state.  
    - **Close schema graph**: Closes the schema graph and returns to the dashboard menu.  

<h2 id="workspaces_menu"> Workspaces menu </h2> 

Workspaces are a powerful feature that allows you to organize your work within a connection.
The opened views and their layout is saved to the workspace, so you can switch between different sets of data and configurations without losing your progress.

The workspaces menu provides access to all available workspaces for the selected connection. You can create new workspaces, switch between existing ones, and manage workspace settings.
Each workspace allows you to work with a separate set of data and configurations, making it easier to organize your work and collaborate with others.
The menu also includes options to clone existing workspaces and delete them if they are no longer needed.

  - **Workspaces**: List of available workspaces. Click to switch to a different workspace.  
    - **Delete workspace**: Opens the delete workspace confirmation dialog  
      - **Delete workspace**: Confirms the deletion of the selected workspace.  
    - **Clone workspace**: Creates a copy of the selected workspace with a new name.  
    - **Workspace settings**: Opens the settings for the selected workspace, allowing you to manage its properties.  
  - **Create new workspace**: Opens the form to create a new workspace for the selected connection.  
    - **Workspace name**: Name of the new workspace.  
    - **Create workspace**: Create and switch to the new workspace with the specified name.  

<h2 id="workspace_area"> Workspace area </h2> 

The workspace area is where you interact with your database connection. 
It includes the SQL editor, data tables, maps, and timecharts, allowing you to execute queries, visualize data, and manage database objects.

  - <a href="#sql_editor">SQL editor</a>: The SQL editor allows users to write and execute SQL queries against the selected database. It provides a user-friendly interface for interacting with the database.  
  - <a href="#table_view">Table view</a>: Allows interacting with a table/view from the database.  
  - <a href="#map_view">Map view</a>: Displays a map visualization based on the Table/SQL query results.  
  - <a href="#timechart_view">Timechart view</a>: Displays a timechart based on the Table/SQL query results.  

