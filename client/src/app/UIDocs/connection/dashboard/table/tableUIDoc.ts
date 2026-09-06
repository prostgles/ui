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
    Table view is the main row-level interface for a Postgres table or view. 
    It supports filtering, sorting, editing, schema-aware row forms, linked data from foreign-key relationships, computed columns, realtime refresh, and related chart/map views.
    
    ## Features

    - **Filtering and search**: Smart filter controls use column metadata and current values to build table filters.
    - **Sorting and layout**: Sort by one or more columns, resize/reorder/hide columns, and switch between table, JSON, card, and grouped card (Kanban style) layouts where available.
    - **Linked data columns**: Add columns from foreign-key relationships. Linked rows can be shown as header/value rows, columns, or compact values; they can be filtered, sorted, limited, joined with left/inner joins, or aggregated with functions such as count, sum, avg, min, and max.
    - **Aggregated linked data**: Use linked or computed values as sortable table columns, including inline bar-style cells and nested timechart-style summaries where supported by the selected data type.
    - **Column rendering**: Configure display format/render-as behavior for values such as URLs, images/media, email, phone, currency, HTML, QR codes, and other supported formats.
    - **Conditional styling**: Apply value-based cell styles, including text/background colors, icons, scales, and bar-style numeric cells.
    - **Smart forms**: Open a row card to view/edit the row using schema-aware inputs and JSONB support. Related records section to navigate the full relational context without leaving the record
    - **Live data refresh**: Tables and views (and related tables) use realtime subscriptions to show latest data.
    - **Audit history**: An audit table can be configured to keep track of data changes and view them from each row card.
    - **Charts, maps, and cross-filtering**: Add timecharts, maps, and cross-filtered table views from the current table. Interactions in linked views preserve the source context through dashboard filters.
    - **Postgres management**: Inspect table/view details and manage columns, indexes, constraints, triggers, policies, access rules, refresh settings, and the current query from the table menu.

    <img src="./screenshots/table.svgif.svg" alt="Table view screenshot" />

    ## Audit history configuration

    To enable auditing, name the audit table Prostgles should create. Auditing keeps track of inserts, updates, and deletes and makes them viewable from each row card.

    \`\`\`ts
    export default prostgles({
      audit: { tableName: "audit_events" },
      // ...
    });
    \`\`\`

    Prostgles creates an audit table with an ID and \`entity_type\`, \`row_filter JSONB\`, \`action\`, \`actor_id\`, \`created_at\`, and \`summary\` columns. PostgreSQL row triggers record inserts, updates, and deletes, including raw SQL and cascading changes. The actor ID comes from the transaction’s \`prostgles.user\` context; writes without that context have a null actor. \`row_filter\` is always an object containing every primary-key column; tables without a primary key must configure an existing unique column group through \`idColumns\`. Snapshots omit configured excluded columns, and updates that only change excluded columns create no event. Additional audit table columns with matching source names can carry project/discipline scope for access rules. The audit table is protected against updates and deletes by a PostgreSQL trigger and must be published with select-only permissions to view its history.

    The optional \`tables\` map enables, disables, or customises auditing per table. Positive entries form an allowlist, for example \`tables: { events: 1, users: { entityType: "client" } }\`. A map containing only disabled entries audits all other configured tables, for example \`tables: { logs: 0, sessions: 0 }\`.
    
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
