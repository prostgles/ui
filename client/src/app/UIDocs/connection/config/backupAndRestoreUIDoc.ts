import type { UIDoc } from "../../../UIDocs";

export const backupAndRestoreUIDoc = {
  type: "tab",
  selectorCommand: "config.bkp",
  title: "Backup/Restore",
  description: "Manage database backups and restore operations.",
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
