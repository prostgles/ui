<h1 id="backup_and_restore"> Backup and Restore </h1> 

Manage database backups and restore operations for this PostgreSQL connection. 
Create reliable backups using PostgreSQL's native tools and restore 
your data when needed.

Backups can be saved to a local file system or to cloud storage to AWS S3.
Similarly, you can restore backups from local files or from AWS S3.

<img src="./screenshots/backup_and_restore.svgif.svg" alt="Backup and Restore" style="border: 1px solid; margin: 1em 0;" />

  - **Create Backup**: Start a new database backup operation.  
    - **Backup Name**: Optional name for the backup to help identify it later.  
    - **Backup Format**: Choose the backup format: Custom, Plain SQL, Tar, or Directory.  
    - **Schema Only**: Backup only the database schema without data.  
    - **Data Only**: Backup only the data without schema.  
    - **Backup Destination**: Choose where to save the backup: Local filesystem or AWS S3.  
    - **Number of Jobs**: Specify the number of parallel jobs to use for the backup process.  
    - **Compression Level**: Set the compression level for the backup (0-9). Higher values mean better compression but slower performance.  
    - **Exclude Schema**: Specify a schema to exclude from the backup.  
    - **No Owner**: Do not output commands to set ownership of objects to match the original database. Useful when restoring to a different database user.  
    - **Create**: Include commands to create the database in the backup.  
    - **Globals Only**: Backup only global objects such as roles and tablespaces.  
    - **Roles Only**: Backup only roles (users) from the database.  
    - **Schema Only**: Backup only the database schema without data.  
    - **Encoding**: Specify the character encoding to use in the backup.  
    - **Clean**: Include commands to drop database objects before recreating them.  
    - **Data Only**: Backup only the data without schema.  
    - **If Exists**: Use IF EXISTS clauses in the backup to avoid errors when dropping objects that do not exist.  
    - **Keep Logs**: Retain log files generated during the backup process.  
    - **Start Backup**: Begin the backup process with the selected options.  
  - **Automatic Backups**: Configure scheduled automatic backups for this database.  
    - **Enable Automatic Backups**: Enable or disable automatic backup scheduling.  
  - **Backups in Progress**: Monitor and manage ongoing backup operations.  
    - **View Logs**: View real-time logs of the ongoing backup operation.  
  - **Restore from File**: Initiate a database restore operation from a local backup file.  
  - **Completed Backups**: View and manage completed backup operations.  
    - **Delete Backup**: Delete the selected backup file from storage. Will ask for confirmation.  
    - **Download Backup**: Download the selected backup file to your local system.  
    - **Restore Backup**: Restore a database from a selected backup file. Will ask for confirmation.  

