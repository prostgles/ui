import { fixIndent, ROUTES } from "../../../../commonTypes/utils";
import type { UIDocContainers } from "../UIDocs";

export const editConnectionUIDoc = {
  type: "page",
  path: ROUTES.EDIT_CONNECTION,
  title: "Edit Connection",
  description:
    "Modify the details of an existing database connection. Update connection settings, credentials, and more.",
  docs: fixIndent(`
    The Edit Connection page allows you to modify the details of an existing database connection.
    You can update connection settings, credentials, and other parameters to ensure your connection is configured correctly.
    <img src="/screenshots/edit-connection.svg" alt="Edit Connection page screenshot" />`),
  children: [
    {
      type: "popup",
      selectorCommand: "PostgresInstallationInstructions",
      title: "PostgreSQL Installation Instructions",
      description: "Instructions for installing PostgreSQL on your system.",
      children: [],
    },
    {
      type: "input",
      inputType: "text",
      selectorCommand: "NewConnectionForm.connectionName",
      title: "Connection Name",
      description: "The name of the connection.",
    },
    {
      type: "input",
      inputType: "text",
      selectorCommand: "NewConnectionForm.connectionType",
      title: "Connection Type",
      description: "",
    },
    {
      type: "input",
      inputType: "text",
      selectorCommand: "NewConnectionForm.db_conn",
      title: "Connection String",
      description: "The connection string for the database. ",
    },
    {
      type: "input",
      inputType: "text",
      selectorCommand: "NewConnectionForm.db_host",
      title: "Database Host",
      description: "The hostname or IP address of the database server.",
    },
    {
      type: "input",
      inputType: "text",
      selectorCommand: "NewConnectionForm.db_port",
      title: "Database Port",
      description: "The port number on which the database server is listening.",
    },
    {
      type: "input",
      inputType: "text",
      selectorCommand: "NewConnectionForm.db_user",
      title: "Database User",
      description: "The username used to connect to the database.",
    },
    {
      type: "input",
      inputType: "text",
      selectorCommand: "NewConnectionForm.db_pass",
      title: "Database Password",
      description: "The password for the database user.",
    },
    {
      type: "input",
      inputType: "text",
      selectorCommand: "NewConnectionForm.db_name",
      title: "Database Name",
      description: "The name of the database to connect to.",
    },
    {
      type: "section",
      selectorCommand: "NewConnectionForm.MoreOptionsToggle",
      title: "More Options",
      description: "Additional connection options.",
      children: [
        {
          type: "select",
          selectorCommand: "NewConnectionForm.schemaFilter",
          title: "Schema Filter",
          description:
            "Controls which schemas are visible in the dashboard (public by default).",
        },
        {
          type: "input",
          inputType: "text",
          selectorCommand: "NewConnectionForm.connectionTimeout",
          title: "Connection Timeout",
          description:
            "The maximum time to wait for a connection to the database before timing out.",
        },
        {
          type: "section",
          selectorCommand: "NewConnectionForm.sslMode",
          title: "SSL Mode",
          description: "Configure SSL settings for the connection.",
          children: [],
        },
        {
          type: "input",
          inputType: "checkbox",
          selectorCommand: "NewConnectionForm.watchSchema",
          title: "Watch Schema",
          description:
            "Enabled by default. Enables schema change tracking. Any changes made to the database schema are reflected in the API and UI.",
        },
        {
          type: "input",
          inputType: "checkbox",
          selectorCommand: "NewConnectionForm.realtime",
          title: "Enable Realtime",
          description:
            "Enabled by default. Enables realtime data change tracking for tables and views. Requires trigger permissions to the underlying tables.",
        },
      ],
    },
    {
      type: "button",
      selectorCommand: "Connection.edit.updateOrCreateConfirm",
      title: "Update Connection",
      description: "Save the changes made to the connection.",
    },
  ],
} satisfies UIDocContainers;
