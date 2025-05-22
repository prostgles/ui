import {
  getCommandElemSelector,
  getDataKeyElemSelector,
} from "../../../../Testing";
import type { UIDocElement } from "../../../UIDocs";

export const tableUIDoc = {
  type: "section",
  selector: `.SilverGridChild[data-view-type="table"]`,
  title: "Table view",
  description: "Allows interacting with a table/view from the database.",
  children: [
    {
      type: "section",
      selector: ".silver-grid-item-header",
      title: "View header",
      description: "View header with menu, title and quick actions.",
      children: [
        {
          type: "section",
          selector: ".W_QuickMenu",
          title: "Quick actions",
          description: "Easy access to charting and joins.",
          children: [
            {
              selectorCommand: "dashboard.window.toggleFilterBar",
              type: "button",
              title: "Toggle filter bar",
              description:
                "Shows or hides the filter bar, allowing users to filter the data displayed in the table.",
            },
            {
              type: "button",
              selectorCommand: "AddChartMenu.Timechart",
              title: "Add timechart",
              description:
                "Adds a timechart visualization. Visible only when at least one timestamp column exists.",
            },
            {
              type: "button",
              selectorCommand: "AddChartMenu.Map",
              title: "Add map",
              description:
                "Adds a map visualization. Visible only when at least one geometry/geography column (postgis extension must be enabled) exists.",
            },
          ],
        },
        {
          type: "text",
          selector: ".silver-grid-item-header--title",
          title: "Table/View name",
          description:
            "The name of the table/view together with the number of records matching the current filters. ",
        },
        {
          selectorCommand: "dashboard.window.collapse",
          type: "button",
          title: "Collapse the view",
          description:
            "Collapses the table view, minimizing it to temporarily save space on the dashboard. ",
        },
        {
          selectorCommand: "dashboard.window.fullscreen",
          type: "button",
          title: "Fullscreen",
          description: "Expands the view to fill the entire screen.",
        },
        {
          selectorCommand: "dashboard.window.close",
          type: "button",
          title: "Close view",
          description: "Closes the table view. ",
        },
        {
          selectorCommand: "dashboard.window.menu",
          type: "popup",
          title: "Table menu",
          description:
            "Opens the table menu, allowing users to manage the table view.",
          children: [
            {
              type: "tab",
              selector: getDataKeyElemSelector("Table info"),
              title: "Table info",
              description: "Shows the table info.",
              children: [
                {
                  type: "section",
                  selectorCommand: "W_TableMenu_TableInfo.name",
                  title: "Table name",
                  description:
                    "Displays the name of the table with option to rename it.",
                  children: [
                    {
                      type: "button",
                      selector: `${getCommandElemSelector("W_TableMenu_TableInfo.name")} button`,
                      title: "Edit name",
                      description: "Opens SQL editor to rename the table.",
                    },
                  ],
                },
                {
                  type: "section",
                  selectorCommand: "W_TableMenu_TableInfo.comment",
                  title: "Comment",
                  description:
                    "Displays and allows editing of the table comment.",
                  children: [
                    {
                      type: "button",
                      selector: `${getCommandElemSelector("W_TableMenu_TableInfo.comment")} button`,
                      title: "Edit comment",
                      description:
                        "Opens SQL editor to modify the table comment.",
                    },
                  ],
                },
                {
                  type: "text",
                  selectorCommand: "W_TableMenu_TableInfo.oid",
                  title: "OID",
                  description:
                    "Displays the object identifier of the table in the database.",
                },
                {
                  type: "text",
                  selectorCommand: "W_TableMenu_TableInfo.type",
                  title: "Type",
                  description: "Shows whether this is a table or view.",
                },
                {
                  type: "text",
                  selectorCommand: "W_TableMenu_TableInfo.owner",
                  title: "Owner",
                  description:
                    "Displays the database user who owns this table/view.",
                },
                {
                  type: "section",
                  selectorCommand: "W_TableMenu_TableInfo.sizeInfo",
                  title: "Size information",
                  description:
                    "Provides details about the table's size and row count.",
                  children: [
                    {
                      type: "text",
                      selector: `${getCommandElemSelector("W_TableMenu_TableInfo.sizeInfo")} [label="Actual Size"]`,
                      title: "Actual Size",
                      description:
                        "The physical size of the table data on disk.",
                    },
                    {
                      type: "text",
                      selector: `${getCommandElemSelector("W_TableMenu_TableInfo.sizeInfo")} [label="Index Size"]`,
                      title: "Index Size",
                      description:
                        "The size of all indexes associated with this table.",
                    },
                    {
                      type: "text",
                      selector: `${getCommandElemSelector("W_TableMenu_TableInfo.sizeInfo")} [label="Total Size"]`,
                      title: "Total Size",
                      description:
                        "The combined size of table data and indexes.",
                    },
                    {
                      type: "text",
                      selector: `${getCommandElemSelector("W_TableMenu_TableInfo.sizeInfo")} [label="Row count"]`,
                      title: "Row count",
                      description: "The total number of rows in the table.",
                    },
                  ],
                },
                {
                  type: "text",
                  selectorCommand: "W_TableMenu_TableInfo.viewDefinition",
                  title: "View definition",
                  description:
                    "Shows the SQL definition for views. Only visible for views, not tables.",
                },
                {
                  type: "button",
                  selectorCommand: "W_TableMenu_TableInfo.vacuum",
                  title: "Vacuum",
                  description:
                    "Performs garbage collection and optionally analyzes the database. Only available for tables.",
                },
                {
                  type: "button",
                  selectorCommand: "W_TableMenu_TableInfo.vacuumFull",
                  title: "Vacuum Full",
                  description:
                    "Performs a more thorough vacuum that can reclaim more space but takes longer and locks the table. Only available for tables.",
                },
                {
                  type: "button",
                  selectorCommand: "W_TableMenu_TableInfo.drop",
                  title: "Drop",
                  description:
                    "Deletes the table or view from the database after confirmation.",
                },
              ],
            },
            {
              type: "tab",
              selector: getDataKeyElemSelector("Columns"),
              title: "Columns",
              description:
                "Allows editing, reordering and toggling table columns.",
              children: [
                {
                  type: "list",
                  selector: getCommandElemSelector("SearchList.List"),
                  title: "Columns list",
                  description:
                    "Allows editing, reordering and toggling table columns.",
                  itemSelector: "li",
                  itemContent: [
                    {
                      type: "popup",
                      selectorCommand: "W_TableMenu_ColumnList.alter",
                      title: "Alter column",
                      description:
                        "Opens a popup to edit the column properties.",
                      children: [],
                    },
                    {
                      type: "popup",
                      selectorCommand:
                        "W_TableMenu_ColumnList.linkedColumnOptions",
                      title: "Edit linked field",
                      description:
                        "Opens a popup to edit the linked field properties.",
                      children: [],
                    },
                    {
                      type: "button",
                      selectorCommand:
                        "W_TableMenu_ColumnList.removeComputedColumn",
                      title: "Remove computed column",
                      description:
                        "Removes a computed column from the table. Only visible for computed columns.",
                    },
                  ],
                },
              ],
            },
            {
              type: "tab",
              selector: getDataKeyElemSelector("Data Refresh"),
              title: "Data Refresh",
              description:
                "Allows setting subscriptions or data refresh rates. By default every table subscribes to data changes.",
              children: [],
            },
            {
              type: "tab",
              selector: getDataKeyElemSelector("Triggers"),
              title: "Triggers",
              description: "Allows managing triggers for the table. ",
              children: [],
            },
          ],
        },
      ],
    },
  ],
} satisfies UIDocElement;
