import { fixIndent, ROUTES } from "../../../../commonTypes/utils";
import { getCommandElemSelector, getDataKeyElemSelector } from "../../Testing";
import type { UIDocContainers, UIDocElement } from "../UIDocs";

const newOwnerOrUserOptions = [
  {
    type: "input",
    inputType: "checkbox",
    title: "Create database owner",
    description:
      "If checked, a new owner will be created for the database. Useful for ensuring the database is owned by a non-superuser account.",
    selectorCommand: "ConnectionServer.withNewOwnerToggle",
  },
  {
    title: "New Owner Name",
    description: "The name of the new owner.",
    selectorCommand: "ConnectionServer.NewUserName",
    type: "input",
    inputType: "text",
  },
  {
    selectorCommand: "ConnectionServer.NewUserPassword",
    title: "New Owner Password",
    description: "The password of the new owner.",
    inputType: "text",
    type: "input",
  },
  {
    type: "section",
    selectorCommand: "ConnectionServer.NewUserPermissionType",
    title: "New Owner Permission Type",
    description:
      "Apart from Owner it is possible to create a user with reduced permission types (SELECT/UPDATE/DELETE/INSERT).",
    children: [],
  },
] satisfies UIDocElement[];

export const connectionsUIDoc = {
  type: "page",
  path: ROUTES.CONNECTIONS,
  title: "Connections",
  description:
    "Manage your database connections. View, add, or edit connections to your databases.",
  docs: fixIndent(`
    The Connections page is the main page and serves as the central hub within Prostgles UI for managing all your PostgreSQL database connections. 
    From here, you can establish new connections, modify existing ones, and gain an immediate overview of their status and associated workspaces. 

    <img src="/screenshots/connections.svg" alt="Connections page screenshot" />
`),
  children: [
    {
      type: "link",
      title: "New connection",
      description: "Opens the form to add a new database connection.",
      selectorCommand: "Connections.new",
      pagePath: ROUTES.NEW_CONNECTION,
    },
    {
      type: "popup",
      title: "Display options",
      description:
        "Customize how the list of connections is displayed (e.g., show/hide state database, show database names).",
      selectorCommand: "ConnectionsOptions",
      children: [
        {
          type: "input",
          title: "Show state connection",
          description:
            "If checked, displays the internal 'Prostgles UI state' connection which stores application metadata and dashboard data.",
          selectorCommand: "ConnectionsOptions.showStateDatabase",
          inputType: "checkbox",
        },
        {
          type: "input",
          title: "Show database names",
          description:
            "If checked, displays the specific database name along with the connection name.",
          selectorCommand: "ConnectionsOptions.showDatabaseNames",
          inputType: "checkbox",
        },
      ],
    },
    {
      type: "list",
      title: "List of available connections",
      description: "Controls to open and manage your database connections.",
      selector: getCommandElemSelector("Connections") + " .Connections_list",
      itemSelector: ".Connection",
      itemContent: [
        {
          type: "popup",
          selectorCommand: "ConnectionServer.add",
          title: "Add or create a database within server",
          description: "Adds a new connection to the selected server. ",
          children: [
            {
              type: "popup",
              selectorCommand: "ConnectionServer.add.newDatabase",
              title: "New Database",
              description: "Create a new database within the server.",
              children: [
                {
                  type: "input",
                  title: "Database Name",
                  description: "The name of the new database.",
                  inputType: "text",
                  selectorCommand: "ConnectionServer.NewDbName",
                },
                {
                  type: "select",
                  title: "Sample Schemas",
                  description:
                    "Select a sample schema to create the database with.",
                  selectorCommand: "ConnectionServer.SampleSchemas",
                },
                ...newOwnerOrUserOptions,
                {
                  selectorCommand: "ConnectionServer.add.confirm",
                  type: "button",
                  title: "Create and connect",
                  description: "Creates and connects to the new database.",
                },
              ],
            },
          ],
        },
        {
          type: "popup",
          selector: getDataKeyElemSelector(
            "Select a database from this server",
          ),
          title: "Connect to an existing database",
          description: "Selects a database from the server to connect to. ",
          children: [
            {
              type: "select",
              title: "Select Database",
              description: "Choose a database from the server.",
              selectorCommand: "ConnectionServer.add.existingDatabase",
            },
            ...newOwnerOrUserOptions,
            {
              selectorCommand: "ConnectionServer.add.confirm",
              type: "button",
              title: "Save and connect",
              description:
                "Connects to the selected database with the new owner.",
            },
          ],
        },
        {
          type: "link",
          selectorCommand: "Connection.openConnection",
          pagePath: ROUTES.CONNECTIONS,
          title: "Open Connection",
          description:
            "Opens the selected database connection on the default workspace.",
          pathItem: {
            tableName: "connections",
          },
        },
        {
          type: "button",
          title: "Debug: Close All Windows",
          selectorCommand: "Connection.closeAllWindows",
          description:
            "Force-closes all windows/tabs for this connection. Use if the workspace becomes unresponsive or encounters a bug.",
        },
        {
          type: "popup",
          title: "Status monitor",
          selectorCommand: "Connection.statusMonitor",
          description:
            "View real-time statistics, running queries, and system resource usage (CPU, RAM, Disk) for this connection.",
          children: [],
        },
        {
          type: "link",
          title: "Configuration page",
          selectorCommand: "Connection.configure",
          description:
            "Access and modify settings for this connection, such as access control, file storage, backup/restore options, and server-side functions.",
          pagePath: ROUTES.CONFIG,
          pathItem: {
            tableName: "connections",
          },
        },
        {
          type: "link",
          title: "Edit connection details",
          selectorCommand: "Connection.edit",
          description:
            "Modify the connection parameters (e.g., display name, database details like host and port). Also allows deleting or cloning the connection.",
          pagePath: ROUTES.EDIT_CONNECTION,
          pathItem: {
            tableName: "connections",
          },
        },
        {
          type: "button",
          title: "Status indicator/Disconnect",
          selectorCommand: "Connection.disconnect",
          description:
            "Shows the current connection status (green indicates connected). Click to disconnect from the database.",
        },
        {
          type: "list",
          selectorCommand: "Connection.workspaceList",
          title: "Workspaces",
          description:
            "List of workspaces associated with this connection. Click to switch to a specific workspace.",
          itemSelector: " [data-key]",
          itemContent: [],
        },
      ],
    },
  ],
} satisfies UIDocContainers;
