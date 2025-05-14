import { getCommandElemSelector } from "../../Testing";
import type { UIDocContainers } from "../UIDocs";

export const connectionsUIDoc = {
  type: "page",
  path: "connections",
  title: "Connections",
  description: "Connections",
  children: [
    {
      type: "link",
      title: "New connection",
      selector: getCommandElemSelector("Connections.new"),
      description: "Add a new database connection",
      children: [],
    },
    {
      type: "popup",
      title: "",
      selector: getCommandElemSelector("ConnectionsOptions"),
      description: "Connections list display/filter options",
      children: [
        {
          type: "input",
          title: "Show state connection",
          selector: getCommandElemSelector(
            "ConnectionsOptions.showStateDatabase",
          ),
          inputType: "checkbox",
          description: "Show state connection",
        },
        {
          type: "input",
          title: "Show database names",
          selector: getCommandElemSelector(
            "ConnectionsOptions.showDatabaseNames",
          ),
          inputType: "checkbox",
          description: "Show database names",
        },
      ],
    },
    {
      type: "list",
      title: "Connections list",
      selector: getCommandElemSelector("Connections") + " .Connections_list",
      description: "List of connections",
      itemSelector: ".Connection",
      itemContent: [
        {
          type: "link",
          selector: "a",
          title: "Connection",
          description: "Connection list item",
          children: [],
        },
        {
          type: "button",
          title: "Close all windows",
          selector: getCommandElemSelector("Connection.closeAllWindows"),
          description:
            "Used in rare cases when there is an issue/bug crashing the workspace. Closes all windows for all workspaces in this connection",
        },
        {
          type: "popup",
          title: "Status monitor",
          selector: getCommandElemSelector("Connection.statusMonitor"),
          description:
            "Shows running queries, system load and information CPU/RAM/Disk usage, etc.",
          children: [],
        },
        {
          type: "link",
          title: "Configuration page",
          selector: getCommandElemSelector("Connection.configure"),
          description:
            "Connection configuration (access control, file storage, backup/restore, server-side functions)",
          children: [],
        },
        {
          type: "link",
          title: "Connection details",
          selector: getCommandElemSelector("Connection.edit"),
          description:
            "Connection details edit (database name, host, port, etc.). Can also be used to delete or clone the connection",
          children: [],
        },
        {
          type: "button",
          title: "Status indicator/Disconnect",
          selector: getCommandElemSelector("Connection.disconnect"),
          description:
            "Status indicator. Green = connected, can click to disconnect",
        },
      ],
    },
  ],
} satisfies UIDocContainers;
