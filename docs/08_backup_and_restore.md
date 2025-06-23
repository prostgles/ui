<h1 id="backup_and_restore"> Backup and Restore </h1> 

Manage database backups and restore operations for this PostgreSQL connection. 
Create reliable backups using PostgreSQL's native tools and restore 
your data when needed.

Backups can be saved to a local file system or to cloud storage to AWS S3.
Similarly, you can restore backups from local files or from AWS S3.

<picture>
<source srcset="./screenshots/dark/backup_and_restore.svg" media="(prefers-color-scheme: dark)">
<img src="./screenshots/backup_and_restore.svg" alt="Backup and Restore" style="border: 1px solid; margin: 1em 0;" />
</picture>

  - **Create Backup**: Start a new database backup operation.  
  - **Start Backup**: Begin the backup process with the selected options.  
  - **Automatic Backups**: Configure scheduled automatic backups for this database.  
    - **Enable Automatic Backups**: Enable or disable automatic backup scheduling.  

<h3 id="edit_connection_details"> Edit connection details </h3> 

Modify the details of an existing database connection.
You can update connection settings, credentials, and other parameters to ensure your connection is configured correctly.

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

