import { fixIndent } from "src/demo/scripts/sqlVideoDemo";
import type { UIDocElement } from "../../../../UIDocs";
import { getCommonViewHeaderUIDoc } from "../../getCommonViewHeaderUIDoc";
import { paginationUIDoc } from "./paginationUIDoc";
import { smartFilterBarUIDoc } from "./smartFilterBarUIDoc";
import { tableMenuUIDoc } from "./tableMenuUIDoc";
import { addColumnMenuUIDoc } from "./addColumnMenuUIDoc";
import { columnMenuUIDoc } from "./columnMenuUIDoc";
import { smartFormUIDoc } from "./smartFormUIDoc";

export const tableUIDoc = {
  type: "section",
  selector: `.SilverGridChild[data-view-type="table"]`,
  title: "Table view",
  description: "Allows interacting with a table/view from the database.",
  docs: fixIndent(`
    The table view allows you to explore, filter, and edit your Postgres data with ease.
    Instantly sort and search, build computed columns, pull in linked data through automatic joins, and create charts, maps, and cross-filtered views in a couple of clicks.
    With smart forms for row editing, rich column controls, and deep schema-aware features, the table view turns your database into an interactive workspace for analysis, tooling, and rapid iteration.

    
    ## Features

    - **Smart filtering**: Use the smart filter bar to quickly filter your data based on column types and values.
    - **Computed columns**: Add calculations or transformations of existing data.
    - **Automatic joins**: Show related data from linked tables with automatic joins and summarise if needed.
    - **Charts and maps**: Timechart and map visualisations with multi-layer support.
    - **Cross-filtered views**: Create additional table or chart views that are cross-filtered by the current table.
    - **Smart forms**: Edit rows using smart forms that adapt to your schema and data types.
    - **Conditional styling**: Style your columns based on row data.

    <img src="./screenshots/table.svgif.svg" alt="Table view screenshot" />
    
    ## Components
    `),
  docOptions: "asSeparateFile",
  children: [
    getCommonViewHeaderUIDoc(
      "The name of the table/view together with the number of records matching the current filters. ",
      tableMenuUIDoc,
      "table",
    ),
    smartFilterBarUIDoc,
    {
      type: "section",
      selector: ".W_Table",
      title: "Table",
      description:
        "The main table view displaying the data from the database. It allows users to interact with the data, including sorting, filtering, and editing.",
      children: [
        {
          type: "section",
          selectorCommand: "TableHeader",
          title: "Table header",
          description:
            "The header of the table, which contains the column names and allows users to sort the data by clicking on the column headers.",
          children: [
            addColumnMenuUIDoc,
            columnMenuUIDoc,
            {
              type: "button",
              selector: `[role="columnheader"]`,
              title: "Column header",
              description:
                "Pressing the header will toggle sorting state (if the column is sortable). Right clicking (or long press on mobile) will open column menu. Dragging the header will allow reordering the columns.",
            },
            {
              type: "drag-handle",
              direction: "x",
              selectorCommand: "TableHeader.resizeHandle",
              title: "Resize column",
              description:
                "Allows users to resize the column width by dragging the handle.",
            },
            smartFormUIDoc,
            {
              selectorCommand: "dashboard.window.rowInsert",
              type: "popup",
              title: "Insert row",
              description:
                "Opens the row insert menu, allowing users to add new rows to the table.",
              children: [],
            },
          ],
        },
      ],
    },
    paginationUIDoc,
  ],
} satisfies UIDocElement;
