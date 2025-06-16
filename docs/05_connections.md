<h1 id="connections"> Connections </h1> 

The Connections page is the main page and serves as the central hub within Prostgles UI for managing all your PostgreSQL database connections. 
From here, you can establish new connections, modify existing ones, and gain an immediate overview of their status and associated workspaces. 

<picture>
<source srcset="./screenshots/dark/connections.svg" media="(prefers-color-scheme: dark)">
<img src="./screenshots/connections.svg" alt="Connections page screenshot" style="border: 1px solid; margin: 1em 0;" />
</picture>

- <a href="#new_connection">New connection</a>: Opens the form to add a new database connection.  
- **Display options**: Customize how the list of connections is displayed (e.g., show/hide state database, show database names).  
  - **Show state connection**: If checked, displays the internal 'Prostgles UI state' connection which stores application metadata and dashboard data.  
  - **Show database names**: If checked, displays the specific database name along with the connection name.  
- <a href="#connection_list">Connection list</a>: Controls to open and manage your database connections.  

<h2 id="new_connection"> New connection </h2> 

Use the **New Connection** button to add a new database connection.
This will open a form where you can enter the connection details such as host, port, database name, user, and password.

<picture>
<source srcset="./screenshots/dark/new_connection.svg" media="(prefers-color-scheme: dark)">
<img src="./screenshots/new_connection.svg" alt="New connection form screenshot" style="border: 1px solid; margin: 1em 0;" />
</picture>

  - **PostgreSQL Installation Instructions**: Instructions for installing PostgreSQL on your system.  
  - **Connection Name**: The name of the connection.  
  - **Connection Type**: Allows you change the connection details format: standard or connection string.  
  - **Connection String**: The connection string for the database.   
  - **Database Host**: The hostname or IP address of the database server.  
  - **Database Port**: The port number on which the database server is listening.  
  - **Database User**: The username used to connect to the database.  
  - **Database Password**: The password for the database user.  
  - **Database Name**: The name of the database to connect to.  
  - **More Options**: Additional connection options.  
    - **Schema Filter**: Controls which schemas are visible in the dashboard (public by default).  
    - **Connection Timeout**: The maximum time to wait for a connection to the database before timing out.  
    - **SSL Mode**: Configure SSL settings for the connection.  
    - **Watch Schema**: Enabled by default. Enables schema change tracking. Any changes made to the database schema are reflected in the API and UI.  
    - **Enable Realtime**: Enabled by default. Enables realtime data change tracking for tables and views. Requires trigger permissions to the underlying tables.  
  - **Update Connection**: Save the changes made to the connection.  

<h2 id="connection_list"> Connection list </h2> 

The connection list displays all your database connections grouped by database host, port and user.

<picture>
<source srcset="./screenshots/dark/connections.svg" media="(prefers-color-scheme: dark)">
<img src="./screenshots/connections.svg" alt="Connections list screenshot" style="border: 1px solid; margin: 1em 0;" />
</picture>

  - **Add or create a database within server**: Adds a new connection to the selected server.   
    - <a href="#create_new_database">Create new database</a>: Create a new database within the server.  
    - <a href="#connect_to_an_existing_database">Connect to an existing database</a>: Selects a database from the server to connect to.   
  - **Open Connection**: Opens the selected database connection on the default workspace.  
  - **Debug: Close All Windows**: Force-closes all windows/tabs for this connection. Use if the workspace becomes unresponsive or encounters a bug.  
  - **Status monitor**: View real-time statistics, running queries, and system resource usage (CPU, RAM, Disk) for this connection.  
  - <a href="#connection_configuration">Connection configuration</a>: Access and modify settings for this connection, such as access control, file storage, backup/restore options, and server-side functions.  
  - <a href="#edit_connection_details">Edit connection details</a>: Modify the connection parameters (e.g., display name, database details like host and port). Also allows deleting or cloning the connection.  
  - **Status indicator/Disconnect**: Shows the current connection status (green indicates connected). Click to disconnect from the database.  
  - **Workspaces**: List of workspaces associated with this connection. Click to switch to a specific workspace.  

<h4 id="create_new_database"> Create new database </h4> 

Allows you to create a new database in the selected server.
It will use the first connection details from the group connection.
If no adequate account is found (no superuser or rolcreatedb), it will be greyed out with with an appropriate explanation tooltip text.

  - **Database Name**: The name of the new database.  
  - **Sample Schemas**: Select a sample schema to create the database with.  
  - **Create database owner**: If checked, a new owner will be created for the database. Useful for ensuring the database is owned by a non-superuser account.  
  - **New Owner Name**: The name of the new owner.  
  - **New Owner Password**: The password of the new owner.  
  - **New Owner Permission Type**: Apart from Owner it is possible to create a user with reduced permission types (SELECT/UPDATE/DELETE/INSERT).  
  - **Create and connect**: Creates and connects to the new database.  

<h4 id="connect_to_an_existing_database"> Connect to an existing database </h4> 

Allows you to connect to an existing database in the selected server.
It will use the first connection details from the group connection. 

<picture>
<source srcset="./screenshots/dark/connect_existing_database.svg" media="(prefers-color-scheme: dark)">
<img src="./screenshots/connect_existing_database.svg" alt="Connect existing database popup screenshot" style="border: 1px solid; margin: 1em 0;" />
</picture>

  - **Select Database**: Choose a database from the server.  
  - **Create database owner**: If checked, a new owner will be created for the database. Useful for ensuring the database is owned by a non-superuser account.  
  - **New Owner Name**: The name of the new owner.  
  - **New Owner Password**: The password of the new owner.  
  - **New Owner Permission Type**: Apart from Owner it is possible to create a user with reduced permission types (SELECT/UPDATE/DELETE/INSERT).  
  - **Save and connect**: Connects to the selected database with the new owner.  

<h3 id="connection_configuration"> Connection configuration </h3> 

Configure the selected database connection. Set connection details, manage users, and customize settings.
<picture>
<source srcset="./screenshots/dark/connection_config.svg" media="(prefers-color-scheme: dark)">
<img src="./screenshots/connection_config.svg" alt="Connection configuration" style="border: 1px solid; margin: 1em 0;" />
</picture>

  - <a href="#connection_details">Connection details</a>: Edit connection parameters such as host, port, database name, and other connection settings.  
  - **Status monitor**: View real-time connection status, running queries, and system resource usage.  
  - <a href="#access_control">Access control</a>: Manage user permissions and access rules for this database connection.  
  - <a href="#file_storage">File storage</a>: Configure file upload and storage settings for this connection.  
  - <a href="#backup_and_restore">Backup and Restore</a>: Manage database backups and restore operations.  
  - **API**: Configure API access settings and view API documentation.  
  - **Table config**: Advanced table configuration using TypeScript (experimental feature).  
  - **Server-side functions**: Configure and manage server-side functions (experimental feature).  

<h4 id="connection_details"> Connection details </h4> 

Modify the details of an existing database connection.
You can update connection settings, credentials, and other parameters to ensure your connection is configured correctly.



