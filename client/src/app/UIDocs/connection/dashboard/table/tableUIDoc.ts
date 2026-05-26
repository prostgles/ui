import type { UIDocElement } from "../../../../UIDocs";
import { getCommonViewHeaderUIDoc } from "../../getCommonViewHeaderUIDoc";
import { addColumnMenuUIDoc } from "./addColumnMenuUIDoc";
import { columnMenuUIDoc } from "./columnMenuUIDoc";
import { paginationUIDoc } from "./paginationUIDoc";
import { smartFilterBarUIDoc } from "./smartFilterBarUIDoc";
import { smartFormUIDoc } from "./smartFormUIDoc";
import { tableMenuUIDoc } from "./tableMenuUIDoc";

export const tableUIDoc = {
  type: "section",
  selector: `.SilverGridChild[data-view-type="table"]`,
  title: "Table view",
  description: "Allows interacting with a table/view from the database.",
  docs: `
    The table view allows you to explore, filter, and edit your Postgres data with ease.
    Search, sort, join, aggregate, create computed columns, pull in linked data through automatic joins, and create charts, maps, and cross-filtered views in a couple of clicks.
    With smart forms that include linked data and allow row editing, rich column controls, and deep schema-aware features, the table view turns your database into an interactive workspace for analysis, tooling, and rapid iteration.

    
    ## Features

    - **Smart filtering and search**: Use the smart filter bar to quickly filter your data based on column types and values.
    - **Multiple display modes**: View the same data as a table, JSON, or card layout with grouping (Kanban style) and ordering options.
    - **Computed columns and functions**: Derive new values, aggregate data, and apply functions without changing the underlying table.
    - **Linked data and joins**: Pull in fields from related tables, control join type, aggregate, and filter or sort nested data.
    - **Rich column controls**: Sort, resize, reorder, hide, format, and style columns, including conditional formatting and inline timechart and bar-chart rendering.
    - **Charts, maps, and cross-filtering**: Turn table data into timecharts and maps, or open linked views that stay cross-filtered with the current selection.
    - **Live data refresh**: Use realtime subscriptions to both tables and views to keep table data current.
    - **Smart forms**: Edit rows using smart forms that adapt to your schema and data types.
    - **Conditional styling**: Style your columns based on value, including inline bar charts and timecharts.
    - **Rich column styling and display formats**: Apply value-based colours and styles, while also rendering emails, phone numbers, URLs, QR codes, currency, HTML, and media or image URLs in more useful formats.
    - **Postgres-aware management**: Access table info, columns, indexes, constraints, triggers, policies, and access rules from the table menu.

    <img src="./screenshots/table.svgif.svg" alt="Table view screenshot" />
    
    ## Components
    `,
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
