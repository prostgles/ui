import {
  getCommandElemSelector,
  getDataKeyElemSelector,
  getDataLabelElemSelector,
} from "../../../../Testing";
import type { UIDocElement } from "../../../UIDocs";

export const dashboardMenuUIDoc = {
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
    {
      type: "popup",
      selector: getCommandElemSelector("dashboard.menu.create"),
      title: "Create/Import",
      description:
        "Opens the menu for creating new tables, server-side functions or importing csv/json files.",
      children: [
        {
          type: "popup",
          selector: getDataKeyElemSelector("new table"),
          title: "Create new table",
          description:
            "Opens the form to create a new table in the current database.",
          children: [
            {
              type: "input",
              inputType: "text",
              selector: getCommandElemSelector(
                "dashboard.menu.createTable.tableName",
              ),
              title: "Table name",
              description:
                "Input field for entering the name of the new table. Must be unique within the database.",
            },
          ],
        },
        {
          type: "popup",
          selector: getDataKeyElemSelector("import file"),
          title: "Import file",
          description:
            "Opens the form to import a file into the current database.",
          children: [
            {
              type: "input",
              inputType: "file",
              selector: getCommandElemSelector("FileBtn"),
              title: "Import file",
              description:
                "Input field for selecting a file to import. Supported types: csv/geojson/json.",
            },
            {
              type: "input",
              inputType: "text",
              selector: getDataLabelElemSelector("Table name"),
              title: "Table name",
              description:
                "New/existing table name into which data is to be imported.",
            },
            {
              type: "input",
              inputType: "checkbox",
              selector: getDataLabelElemSelector(
                "Try to infer and apply column data types",
              ),
              title: "Try to infer and apply column data types",
              description:
                "Checkbox for inferring and applying column data types during import. If checked, the system will attempt to determine the appropriate data types for each column based on the imported file. If unchecked, TEXT data type will be used for all columns.",
            },
            {
              type: "input",
              inputType: "checkbox",
              selector: getDataLabelElemSelector("Drop table if exists"),
              title: "Drop table if exists",
              description:
                "Checkbox for dropping the table if it already exists in the database. If checked, the existing table will be deleted before importing the new file.",
            },
            {
              type: "select",
              selector: getDataLabelElemSelector("Insert as"),
              title: "Insert as",
              description:
                "Select list for choosing the method of inserting JSON/GeoJSON data into the table. Options include: Single text value, JSONB rows, and Properties with geometry.",
            },
            {
              type: "button",
              selector: getCommandElemSelector("FileImporterFooter.import"),
              title: "Import",
              description:
                "Button to initiate the import process. Click to start importing the selected file into the specified table.",
            },
          ],
        },
        {
          type: "popup",
          selector: getDataKeyElemSelector("new function"),
          title: "Create TS Function",
          description:
            "Opens the form to create a new server-side TypeScript function for the current database.",
          children: [],
        },
      ],
    },
    {
      type: "popup",
      selector: getCommandElemSelector("SchemaGraph"),
      title: "Schema graph",
      description:
        "Opens the schema graph for visualizing the relationships between tables and views in the current database.",
      children: [
        {
          type: "section",
          title: "Top controls",
          description:
            "Controls for managing the schema graph view and layout.",
          selector: getCommandElemSelector("SchemaGraph.TopControls"),
          children: [
            {
              type: "select",
              selector: getCommandElemSelector(
                "SchemaGraph.TopControls.tableRelationsFilter",
              ),
              title: "Table relationship filter",
              description:
                "Display tables based on their relationship type. Options include: all, linked (with relationships), orphaned (without relationships).",
            },
            {
              type: "select",
              selector: getCommandElemSelector(
                "SchemaGraph.TopControls.columnRelationsFilter",
              ),
              title: "Column relationship filter",
              description:
                "Display columns based on their relationship type. Options include: all, references (with relationships), none (no columns/only table names will be shown).",
            },
            {
              type: "select",
              title: "Link colour mode",
              selector: getCommandElemSelector(
                "SchemaGraph.TopControls.linkColorMode",
              ),
              description:
                "Colour links by: default (fixed colour), root table (the colour of the table the relationship tree originates from), on-delete/on-update (colour based on constraint referential action).",
            },
            {
              type: "button",
              selector: getCommandElemSelector(
                "SchemaGraph.TopControls.resetLayout",
              ),
              title: "Reset layout",
              description:
                "Moving tables is persisted the state database. Clicking this resets the schema graph layout to its initial state.",
            },
            {
              type: "button",
              selector: getCommandElemSelector("Popup.close"),
              title: "Close schema graph",
              description:
                "Closes the schema graph and returns to the dashboard menu.",
            },
          ],
        },
      ],
    },
  ],
} satisfies UIDocElement;
