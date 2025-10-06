import { ROUTES } from "@common/utils";
import { mdiDatabasePlusOutline, mdiFilter, mdiServerNetwork } from "@mdi/js";
import { getCommandElemSelector, getDataKeyElemSelector } from "../../Testing";
import type { UIDocContainers, UIDocElement } from "../UIDocs";
import { editConnectionUIDoc } from "./editConnectionUIDoc";

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
  iconPath: mdiServerNetwork,
  description:
    "Manage your database connections. View, add, or edit connections to your databases.",
  docs: `
    The Connections page serves as the central hub within Prostgles UI for managing all your PostgreSQL database connections. 
    From here, you can establish new connections, modify existing ones, and gain an immediate overview of their status and associated workspaces. 

    <img src="/screenshots/connections.svg" alt="Connections page screenshot" />  
      
`,
  childrenTitle: "Connection controls",
  children: [
    {
      type: "link",
      title: "New connection",
      iconPath: mdiDatabasePlusOutline,
      description: "Opens the form to add a new database connection.",
      selectorCommand: "Connections.new",
      path: ROUTES.NEW_CONNECTION,
      docs: `
        Use the **New Connection** button to add a new database connection.
        
        <img src="/screenshots/connections.svg#Connections_new" alt="New connection button" style="max-width: 200px;" />

        This will open a form where you can enter the connection details such as host, port, database name, user, and password.
        
        <img src="/screenshots/new_connection.svgif.svg" alt="New connection form screenshot" />
      `,
      childrenTitle: "New connection form fields",
      docOptions: { title: "Adding a connection" },
      pageContent: editConnectionUIDoc.children,
    },
    {
      type: "popup",
      title: "Display options",
      description:
        "Customize how the list of connections is displayed (e.g., show/hide state database, show database names).",
      selectorCommand: "ConnectionsOptions",
      iconPath: mdiFilter,
      docOptions: "hideChildren",
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
      title: "Connection list",
      description: "Controls to open and manage your database connections.",
      docs: `
        The connection list displays all your database connections grouped by database host, port and user.
        
        <img src="/screenshots/connections.svg" alt="Connections list screenshot" />
        `,
      selector: getCommandElemSelector("Connections") + " .Connections_list",
      itemSelector: ".Connection",
      childrenTitle: "Connection actions",
      itemContent: [
        {
          type: "link",
          selectorCommand: "Connection.openConnection",
          path: ROUTES.CONNECTIONS,
          title: "Open connection",
          description:
            "Opens the selected connection dashboard on the default workspace.",
          pathItem: {
            tableName: "connections",
          },
        },
        {
          type: "popup",
          selectorCommand: "ConnectionServer.add",
          title: "Add new database",
          description: "Adds a new connection to the selected server. ",
          children: [
            {
              type: "popup",
              selectorCommand: "ConnectionServer.add.newDatabase",
              title: "Create new database",
              description: "Create a new database within the server.",
              docs: `
                Allows you to create a new database in the selected server.
                It will use the first connection details from the group connection.
                If no adequate account is found (no superuser or rolcreatedb), it will be greyed out with with an appropriate explanation tooltip text.

              `,
              childrenTitle: "New database options",
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
            {
              type: "popup",
              selector: getDataKeyElemSelector("Select existing database"),
              title: "Connect to an existing database",
              description: "Selects a database from the server to connect to. ",
              docs: `
                Allows you to connect to an existing database in the selected server.
                It will use the first connection details from the group connection. 

                <img src="/screenshots/connect_existing_database.svg" alt="Connect existing database popup screenshot" />

                After selecting the database, you can choose to create a new owner or user for the connection should you need to.
              `,
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
          ],
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
          title: "Connection configuration",
          selectorCommand: "Connection.configure",
          description:
            "Access and modify settings for this connection, such as access control, file storage, backup/restore options, and server-side functions.",
          path: ROUTES.CONFIG,
          pathItem: {
            tableName: "connections",
          },
          // TODO: we need to move shared pages to the end
          // docs: connectionConfigUIDoc.docs,
          // pageContent: connectionConfigUIDoc.children,
        },
        {
          type: "link",
          title: "Edit connection details",
          selectorCommand: "Connection.edit",
          description:
            "Modify the connection parameters (e.g., display name, database details like host and port). Also allows deleting or cloning the connection.",
          docs: editConnectionUIDoc.docs,
          path: ROUTES.EDIT_CONNECTION,
          pathItem: {
            tableName: "connections",
          },
          pageContent: editConnectionUIDoc.children,
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
