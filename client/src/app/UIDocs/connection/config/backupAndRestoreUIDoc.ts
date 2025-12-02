import { mdiDatabaseSync } from "@mdi/js";
import type { UIDoc } from "../../../UIDocs";

export const backupAndRestoreUIDoc = {
  type: "tab",
  selectorCommand: "config.bkp",
  title: "Backup and Restore",
  description: "Manage database backups and restore operations.",
  docOptions: "asSeparateFile",
  iconPath: mdiDatabaseSync,
  docs: `
    Manage database backups and restore operations for this PostgreSQL connection. 
    Create reliable backups using PostgreSQL's native tools and restore 
    your data when needed.

    Backups can be saved to a local file system or to cloud storage to AWS S3.
    Similarly, you can restore backups from local files or from AWS S3.

    <img src="./screenshots/backup_and_restore.svgif.svg" alt="Backup and Restore" />
  `,
  children: [
    {
      type: "popup",
      selectorCommand: "config.bkp.create",
      title: "Create Backup",
      description: "Start a new database backup operation.",
      children: [
        {
          type: "input",
          inputType: "text",
          selectorCommand: "config.bkp.create.name",
          title: "Backup Name",
          description:
            "Optional name for the backup to help identify it later.",
        },
        {
          type: "select",
          selectorCommand: "PGDumpOptions.format",
          title: "Backup Format",
          description:
            "Choose the backup format: Custom, Plain SQL, Tar, or Directory.",
        },
        {
          type: "input",
          inputType: "checkbox",
          selectorCommand: "PGDumpOptions.schemaOnly",
          title: "Schema Only",
          description: "Backup only the database schema without data.",
        },
        {
          type: "input",
          inputType: "checkbox",
          selectorCommand: "PGDumpOptions.dataOnly",
          title: "Data Only",
          description: "Backup only the data without schema.",
        },
        {
          type: "select",
          selectorCommand: "PGDumpOptions.destination",
          title: "Backup Destination",
          description:
            "Choose where to save the backup: Local filesystem or AWS S3.",
        },
        {
          selectorCommand: "PGDumpOptions.numberOfJobs",
          type: "input",
          inputType: "number",
          title: "Number of Jobs",
          description:
            "Specify the number of parallel jobs to use for the backup process.",
        },
        {
          selectorCommand: "PGDumpOptions.compressionLevel",
          type: "input",
          inputType: "number",
          title: "Compression Level",
          description:
            "Set the compression level for the backup (0-9). Higher values mean better compression but slower performance.",
        },
        {
          selectorCommand: "PGDumpOptions.excludeSchema",
          type: "input",
          inputType: "text",
          title: "Exclude Schema",
          description: "Specify a schema to exclude from the backup.",
        },
        {
          selectorCommand: "PGDumpOptions.noOwner",
          type: "input",
          inputType: "checkbox",
          title: "No Owner",
          description:
            "Do not output commands to set ownership of objects to match the original database. Useful when restoring to a different database user.",
        },
        {
          selectorCommand: "PGDumpOptions.create",
          type: "input",
          inputType: "checkbox",
          title: "Create",
          description: "Include commands to create the database in the backup.",
        },
        {
          selectorCommand: "PGDumpOptions.globalsOnly",
          type: "input",
          inputType: "checkbox",
          title: "Globals Only",
          description:
            "Backup only global objects such as roles and tablespaces.",
        },
        {
          selectorCommand: "PGDumpOptions.rolesOnly",
          type: "input",
          inputType: "checkbox",
          title: "Roles Only",
          description: "Backup only roles (users) from the database.",
        },
        {
          selectorCommand: "PGDumpOptions.schemaOnly",
          type: "input",
          inputType: "checkbox",
          title: "Schema Only",
          description: "Backup only the database schema without data.",
        },
        {
          selectorCommand: "PGDumpOptions.encoding",
          type: "input",
          inputType: "text",
          title: "Encoding",
          description: "Specify the character encoding to use in the backup.",
        },
        {
          selectorCommand: "PGDumpOptions.clean",
          type: "input",
          inputType: "checkbox",
          title: "Clean",
          description:
            "Include commands to drop database objects before recreating them.",
        },
        {
          selectorCommand: "PGDumpOptions.dataOnly",
          type: "input",
          inputType: "checkbox",
          title: "Data Only",
          description: "Backup only the data without schema.",
        },
        {
          selectorCommand: "PGDumpOptions.ifExists",
          type: "input",
          inputType: "checkbox",
          title: "If Exists",
          description:
            "Use IF EXISTS clauses in the backup to avoid errors when dropping objects that do not exist.",
        },
        {
          selectorCommand: "PGDumpOptions.keepLogs",
          type: "input",
          inputType: "checkbox",
          title: "Keep Logs",
          description: "Retain log files generated during the backup process.",
        },

        {
          type: "button",
          selectorCommand: "config.bkp.create.start",
          title: "Start Backup",
          description: "Begin the backup process with the selected options.",
        },
      ],
    },
    {
      type: "popup",
      selectorCommand: "config.bkp.AutomaticBackups",
      title: "Automatic Backups",
      description: "Configure scheduled automatic backups for this database.",
      children: [
        {
          type: "input",
          inputType: "checkbox",
          selectorCommand: "config.bkp.AutomaticBackups.toggle",
          title: "Enable Automatic Backups",
          description: "Enable or disable automatic backup scheduling.",
        },
      ],
    },
    {
      type: "section",
      selectorCommand: "BackupControls.backupsInProgress",
      title: "Backups in Progress",
      description: "Monitor and manage ongoing backup operations.",
      children: [
        {
          selectorCommand: "BackupLogs",
          type: "button",
          title: "View Logs",
          description: "View real-time logs of the ongoing backup operation.",
        },
      ],
    },
    {
      selectorCommand: "BackupsControls.restoreFromFile",
      type: "button",
      title: "Restore from File",
      description:
        "Initiate a database restore operation from a local backup file.",
    },
    {
      type: "list",
      selectorCommand: "BackupsControls.Completed",
      title: "Completed Backups",
      description: "View and manage completed backup operations.",
      itemSelector: `[data-key]`,
      itemContent: [
        {
          type: "button",
          selectorCommand: "BackupsControls.Completed.delete",
          title: "Delete Backup",
          description:
            "Delete the selected backup file from storage. Will ask for confirmation.",
        },
        {
          type: "button",
          selectorCommand: "BackupsControls.Completed.download",
          title: "Download Backup",
          description:
            "Download the selected backup file to your local system.",
        },
        {
          type: "button",
          selectorCommand: "BackupsControls.Completed.restore",
          title: "Restore Backup",
          description:
            "Restore a database from a selected backup file. Will ask for confirmation.",
        },
      ],
    },
  ],
} satisfies UIDoc;
