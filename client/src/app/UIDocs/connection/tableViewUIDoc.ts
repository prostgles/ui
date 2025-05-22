import { getCommandElemSelector } from "../../../Testing";
import type { UIDocElement } from "../../UIDocs";

export const tableViewUIDoc = {
  type: "section",
  selector: ".DashboardMenuContent",
  title: "Dashboard menu",
  description:
    "Main menu for navigating and managing the database tables and views.",
  children: [
    {
      type: "button",
      selector: getCommandElemSelector("dashboard.menu.sqlEditor"),
      title: "SQL editor",
      description:
        "Opens the SQL editor for executing SQL queries against the selected database.",
    },
    {
      type: "popup",
      selector: getCommandElemSelector("dashboard.menu.quickSearch"),
      title: "Quick search",
      description:
        "Opens the quick search menu for searching across all available tables and views from the current database.",
      children: [],
    },
    {
      type: "smartform-popup",
      tableName: "workspaces",
      fieldNames: ["options"],
      selector: getCommandElemSelector("dashboard.menu.settings"),
      title: "Settings",
      description:
        "Opens the settings menu for configuring dashboard layout preferences.",
    },
    {
      type: "button",
      selector: getCommandElemSelector("DashboardMenuHeader.togglePinned"),
      title: "Pin/Unpin menu",
      description:
        "Toggles the pinning of the dashboard menu. Pinned menus remain open until unpinned or accessing from a low width screen.",
    },
    {
      type: "drag-handle",
      direction: "x",
      title: "Resize menu",
      description:
        "Allows resizing the dashboard menu. Drag to adjust the width of the menu.",
      selector: getCommandElemSelector("dashboard.menu.resize"),
    },
    {
      type: "drag-handle",
      direction: "x",
      selector: getCommandElemSelector("dashboard.centered-layout.resize"),
      title: "Resize centered layout",
      description:
        "Allows resizing the workspace area when centered layout is enabled. Drag to adjust the width of the centered layout.",
    },

    {
      type: "list",
      selector: getCommandElemSelector("dashboard.menu.savedQueriesList"),
      title: "Saved queries",
      description:
        "List of saved queries of the current user from the current workspace. Click to open a saved query.",
      itemContent: [],
      itemSelector: "li",
    },
    {
      type: "list",
      selector: getCommandElemSelector("dashboard.menu.tablesSearchList"),
      title: "Tables and views",
      description:
        "List of tables and views from the current database. Click to open a table or view. By default only the tables from the public schema are shown. Schema list from the connection settings controls which schemas are shown.",
      itemSelector: "li",
      itemContent: [],
    },
    {
      type: "list",
      selector: getCommandElemSelector(
        "dashboard.menu.serverSideFunctionsList",
      ),
      title: "Server-side functions",
      description:
        "List of server-side functions for the current database. Click to open a function.",
      itemSelector: "li",
      itemContent: [],
    },
  ],
} satisfies UIDocElement;
