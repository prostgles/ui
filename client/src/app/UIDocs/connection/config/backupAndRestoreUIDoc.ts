import type { UIDoc } from "../../../UIDocs";

export const backupAndRestoreUIDoc = {
  type: "tab",
  selectorCommand: "config.bkp",
  title: "Backup and Restore",
  description: "Manage database backups and restore operations.",
  asSeparateFile: true,
  docs: `
    Manage database backups and restore operations for this PostgreSQL connection. 
    Create reliable backups using PostgreSQL's native tools and restore 
    your data when needed.

    Backups can be saved to a local file system or to cloud storage to AWS S3.
    Similarly, you can restore backups from local files or from AWS S3.

    <img src="/screenshots/backup_and_restore.svg" alt="Backup and Restore" />
  `,
  children: [
    {
      type: "button",
      selectorCommand: "config.bkp.create",
      title: "Create Backup",
      description: "Start a new database backup operation.",
    },
    {
      type: "button",
      selectorCommand: "config.bkp.create.start",
      title: "Start Backup",
      description: "Begin the backup process with the selected options.",
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
  ],
} satisfies UIDoc;
