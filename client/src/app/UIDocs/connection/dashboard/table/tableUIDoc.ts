import { fixIndent } from "../../../../../demo/scripts/sqlVideoDemo";
import type { UIDocElement } from "../../../../UIDocs";
import { getCommonViewHeaderUIDoc } from "../../getCommonViewHeaderUIDoc";
import { paginationUIDoc } from "./paginationUIDoc";
import { smartFilterBarUIDoc } from "./smartFilterBarUIDoc";
import { tableMenuUIDoc } from "./tableMenuUIDoc";

export const tableUIDoc = {
  type: "section",
  selector: `.SilverGridChild[data-view-type="table"]`,
  title: "Table view",
  description: "Allows interacting with a table/view from the database.",
  docs: fixIndent(`
    The table view displays data from a database table or view, allowing users to interact with the data, including sorting, filtering, and editing.
    It supports computed columns, linked fields, and various actions for managing the data.
    <img src="./screenshots/table.svg" alt="Table view screenshot" />`),
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
            {
              type: "popup",
              selectorCommand: "AddColumnMenu",
              title: "Add column menu",
              description:
                "Opens the column menu, allowing users to add computed columns, create new columns, add linked fields.",
              children: [],
            },
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
            {
              type: "popup",
              selectorCommand: "dashboard.window.viewEditRow",
              title: "Edit row",
              description:
                "Opens the row edit menu, allowing users to view/edit/delete the selected row.",
              children: [],
            },
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
