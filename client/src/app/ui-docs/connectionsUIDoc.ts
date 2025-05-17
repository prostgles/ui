import { getCommandElemSelector } from "../../Testing";
import type { UIDocContainers } from "../UIDocs";

export const connectionsUIDoc = {
  type: "page",
  path: "connections",
  title: "Connections",
  description:
    "Manage your database connections. View, add, or edit connections to your databases.",
  children: [
    {
      type: "link",
      title: "New connection",
      description: "Opens the form to add a new database connection.",
      selector: getCommandElemSelector("Connections.new"),
      pagePath: "/new-connection",
    },
    {
      type: "popup",
      title: "Display options",
      description:
        "Customize how the list of connections is displayed (e.g., show/hide state database, show database names).",
      selector: getCommandElemSelector("ConnectionsOptions"),
      children: [
        {
          type: "input",
          title: "Show state connection",
          description:
            "If checked, displays the internal 'Prostgles UI state' connection which stores application metadata and dashboard data.",
          selector: getCommandElemSelector(
            "ConnectionsOptions.showStateDatabase",
          ),
          inputType: "checkbox",
        },
        {
          type: "input",
          title: "Show database names",
          description:
            "If checked, displays the specific database name along with the connection name.",
          selector: getCommandElemSelector(
            "ConnectionsOptions.showDatabaseNames",
          ),
          inputType: "checkbox",
        },
      ],
    },
    {
      type: "list",
      title: "List",
      description: "List of available connections",
      selector: getCommandElemSelector("Connections") + " .Connections_list",
      itemSelector: ".Connection",
      itemContent: [
        {
          type: "link",
          selector: "a",
          title: "Open Connection",
          description:
            "Opens the selected database connection on the default workspace.",
          pagePath: "/connections/:connectionId",
        },
        {
          type: "button",
          title: "Debug: Close All Windows",
          selector: getCommandElemSelector("Connection.closeAllWindows"),
          description:
            "Force-closes all windows/tabs for this connection. Use if the workspace becomes unresponsive or encounters a bug.",
        },
        {
          type: "popup",
          title: "Status monitor",
          selector: getCommandElemSelector("Connection.statusMonitor"),
          description:
            "View real-time statistics, running queries, and system resource usage (CPU, RAM, Disk) for this connection.",
          children: [],
        },
        {
          type: "link",
          title: "Configuration page",
          selector: getCommandElemSelector("Connection.configure"),
          description:
            "Access and modify settings for this connection, such as access control, file storage, backup/restore options, and server-side functions.",
          pagePath: "/connection-config/:connectionId",
        },
        {
          type: "link",
          title: "Edit connection details",
          selector: getCommandElemSelector("Connection.edit"),
          description:
            "Modify the connection parameters (e.g., display name, database details like host and port). Also allows deleting or cloning the connection.",
          pagePath: "/edit-connection/:connectionId",
        },
        {
          type: "button",
          title: "Status indicator/Disconnect",
          selector: getCommandElemSelector("Connection.disconnect"),
          description:
            "Shows the current connection status (green indicates connected). Click to disconnect from the database.",
        },
      ],
    },
  ],
} satisfies UIDocContainers;
