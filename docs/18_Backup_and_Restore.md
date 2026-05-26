<h1 id="backup_and_restore"> Backup and Restore </h1> 

Manage database backups and restore operations for this PostgreSQL connection. 
Create reliable backups using PostgreSQL's native tools and restore 
your data when needed.

Backups can be saved to a local file system or to cloud storage to AWS S3.
Similarly, you can restore backups from local files or from AWS S3.

<img src="./screenshots/backup_and_restore.svgif.svg" alt="Backup and Restore" style="border: 1px solid; margin: 1em 0;" />

  - **Create Backup**: Start a new database backup operation.  
  - **Automatic Backups**: Configure scheduled automatic backups for this database.  
    - **Enable Automatic Backups**: Enable or disable automatic backup scheduling.  
  - **Backups in Progress**: Monitor and manage ongoing backup operations.  
    - **View Logs**: View real-time logs of the ongoing backup operation.  
  - **Restore from File**: Initiate a database restore operation from a local backup file.  
  - **Completed Backups**: View and manage completed backup operations.  
    - **Delete Backup**: Delete the selected backup file from storage. Will ask for confirmation.  
    - **Download Backup**: Download the selected backup file to your local system.  
    - **Restore Backup**: Restore a database from a selected backup file. Will ask for confirmation.  

