import { mdiChartLine, mdiDatabaseCogOutline } from "@mdi/js";
import { fixIndent, ROUTES } from "../../../../../common/utils";
import type { UIDocContainers } from "../../UIDocs";
import { editConnectionUIDoc } from "../editConnectionUIDoc";
import { accessControlUIDoc } from "./config/accessControlUIDoc";
import { apiUIDoc } from "./config/apiUIDoc";
import { backupAndRestoreUIDoc } from "./config/backupAndRestoreUIDoc";
import { fileStorageUIDoc } from "./config/fileStorageUIDoc";

export const connectionConfigUIDoc = {
  type: "page",
  path: ROUTES.CONFIG,
  iconPath: mdiDatabaseCogOutline,
  pathItem: {
    tableName: "connections",
    selectorCommand: "Connection.configure",
    selectorPath: ROUTES.CONNECTIONS,
  },
  title: "Connection configuration",
  description:
    "Configure the selected database connection. Set connection details, manage users, and customize settings.",
  docs: fixIndent(`
    Configure the selected database connection. Set connection details, manage users, and customize settings.
    <img src="/screenshots/connection_config.svg" alt="Connection configuration" />
    <img src="/screenshots/connection_config_expanded.svg" alt="Connection configuration" />
  `),
  children: [
    {
      type: "tab",
      selectorCommand: "config.details",
      title: "Connection details",
      description:
        "Edit connection parameters such as host, port, database name, and other connection settings.",
      docs: editConnectionUIDoc.docs,
      iconPath: mdiDatabaseCogOutline,
      children: [],
    },
    {
      type: "tab",
      selectorCommand: "config.status",
      title: "Status monitor",
      iconPath: mdiChartLine,
      description:
        "View real-time connection status, running queries, and system resource usage.",
      children: [],
    },
    accessControlUIDoc,
    fileStorageUIDoc,
    backupAndRestoreUIDoc,
    apiUIDoc,
    {
      type: "tab",
      selectorCommand: "config.tableConfig",
      title: "Table config",
      description:
        "Advanced table configuration using TypeScript (experimental feature).",
      children: [],
    },
    {
      type: "tab",
      selectorCommand: "config.methods",
      title: "Server-side functions",
      description:
        "Configure and manage server-side functions (experimental feature).",
      children: [],
    },
  ],
} satisfies UIDocContainers;
