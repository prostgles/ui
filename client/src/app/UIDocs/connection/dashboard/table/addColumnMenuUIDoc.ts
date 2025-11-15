import type { UIDoc } from "src/app/UIDocs";
import { getCommandElemSelector } from "src/Testing";

export const addColumnMenuUIDoc = {
  type: "popup",
  selectorCommand: "AddColumnMenu",
  title: "Add column menu",
  description:
    "Opens the add column menu, allowing users to add computed columns, create new columns, add linked fields.",
  children: [
    {
      type: "popup",
      selector: `${getCommandElemSelector("AddColumnMenu")} [data-key="Computed"]`,
      title: "Add Computed Field",
      description:
        "Opens a popup to create a computed column - calculations or transformations based on existing data using functions like aggregations, date formatting, string operations, etc.",
      children: [
        {
          type: "button",
          selectorCommand: "AddComputedColMenu.countOfAllRows",
          title: "Count of all rows",
          description:
            "Creates a computed column that displays the total count of all rows in the table, regardless of filters.",
        },
        {
          type: "list",
          selectorCommand: "SearchList.List",
          title: "Column selection",
          description:
            "List of available columns to apply functions to. Choose a column to start creating a computed field.",
          itemSelector: "li",
          itemContent: [],
        },
        {
          type: "list",
          selectorCommand: "FunctionSelector",
          title: "Function selector",
          description:
            "Choose a function to apply to the selected column (e.g., aggregates (min/max/avg), date formatting, string operations).",
          itemContent: [],
          itemSelector: `li[role="option"]`,
        },
        {
          type: "input",
          inputType: "text",
          selectorCommand: "AddComputedColMenu.name",
          title: "Column name",
          description:
            "Name for the new computed column. Auto-generated based on the function and column.",
        },
        {
          type: "select",
          selectorCommand: "AddComputedColMenu.addTo",
          title: "Add to position",
          description:
            "Choose whether to add the computed column at the start or end of the column list.",
        },
        {
          type: "button",
          selectorCommand: "AddComputedColMenu.addBtn",
          title: "Add computed column",
          description:
            "Confirms and adds the new computed column to the table based on the selected function and parameters.",
        },
      ],
    },
    {
      type: "popup",
      selector: `${getCommandElemSelector("AddColumnMenu")} [data-key="Referenced"]`,
      title: "Add Linked Data",
      description:
        "Opens a popup to display data from related tables via foreign key relationships. Disabled if no foreign keys exist or when using aggregates with nested columns.",

      children: [
        {
          type: "select",
          selectorCommand: "JoinPathSelectorV2",
          title: "Join path selector",
          description:
            "Select which related table to join to via foreign key relationships. Shows available join paths from the current table.",
        },
        {
          type: "input",
          inputType: "text",
          selector: "#nested-col-name",
          title: "Column label",
          description:
            "Custom name/label for this linked column field in the table. Defaults to the related table name.",
        },
        {
          type: "select",
          selectorCommand: "LinkedColumn.ColumnList.toggle",
          title: "Linked column selection",
          description:
            "Choose which columns from the related table to display in this linked field.",
        },
        {
          type: "select",
          selectorCommand: "QuickAddComputedColumn",
          title: "Quick add computed column",
          description:
            "Add a single computed column from the linked table. E.g., count, sum, avg.",
        },
        {
          type: "section",
          selector: ".ExpandSection",
          title: "More options",
          description:
            "Additional configuration for linked columns including layout, join type, filters, and limits.",
          children: [
            {
              type: "select",
              selector: "LinkedColumn.layoutType",
              title: "Layout mode",
              description:
                "Choose how to display the linked data: as rows, columns, or without headers.",
            },
            {
              type: "select",
              selectorCommand: "LinkedColumn.joinType",
              title: "Join type",
              description:
                "Select between inner join (discards parent rows without matches) or left join (keeps all parent rows).",
            },
            {
              type: "input",
              inputType: "number",
              selector: "#nested-col-limit",
              title: "Limit",
              description:
                "Maximum number of linked records to display (0-30). Optional.",
            },
            {
              type: "section",
              selectorCommand: "SmartFilterBar",
              title: "Filters and sorting",
              description:
                "Apply filters and sorting to the linked table data.",
              children: [],
            },
          ],
        },
      ],
    },
    {
      type: "popup",
      selector: `${getCommandElemSelector("AddColumnMenu")} [data-key="Create"]`,
      title: "Create New Column",
      description:
        "Opens a popup to create a new physical column in the database table. Disabled for views or users without SQL privileges.",
      children: [
        {
          type: "section",
          selectorCommand: "ColumnEditor.name",
          title: "Column editor",
          description:
            "Configure column properties including name, data type, constraints, default values, and foreign key references.",
          children: [],
        },
        {
          type: "select",
          selectorCommand: "AddColumnReference",
          title: "Foreign key reference",
          description:
            "Optionally set up a foreign key relationship to another table/column in the database.",
        },
        {
          type: "select",
          selectorCommand: "ColumnEditor.dataType",
          title: "Data type selection",
          description:
            "Appears after typing the column name. Choose the data type for the new column (e.g., integer, text, date, boolean, etc.).",
        },
        {
          type: "tab",
          selectorCommand: "CreateColumn.next",
          title: "Show create column SQL",
          description:
            "Generates and displays the SQL query that will be executed to create the new column in the database.",
          children: [
            {
              type: "input",
              inputType: "text",
              selectorCommand: "MonacoEditor",
              title: "Generated SQL query",
              description:
                "The generated ALTER TABLE SQL query to create the new column based on the specified properties.",
            },
            {
              type: "button",
              selectorCommand: "SQLSmartEditor.Run",
              title: "Execute create column",
              description:
                "Runs the generated ALTER TABLE query to create the new column in the database.",
            },
          ],
        },
      ],
    },
    {
      type: "popup",
      selector: `${getCommandElemSelector("AddColumnMenu")} [data-key="CreateFileColumn"]`,
      title: "Create New File Column",
      description:
        "Opens a popup to create a new column for handling file uploads and attachments. Requires file storage to be enabled.",
      children: [
        {
          type: "input",
          inputType: "text",
          selector: `[data-label="New column name"] input`,
          title: "New column name",
          description: "Name for the new file column.",
        },
        {
          type: "input",
          inputType: "checkbox",
          selector: ".SwitchToggle",
          title: "Optional",
          description:
            "Whether the file column should allow NULL values (optional) or require a file (NOT NULL).",
        },
        {
          type: "section",
          selectorCommand: "FileColumnConfigEditor",
          title: "File column configuration",
          description:
            "Configure accepted file types and other file handling options. Appears after entering the column name.",
          children: [
            {
              type: "input",
              title: "Maximum file size in megabytes",
              inputType: "number",
              selectorCommand: "FileColumnConfigEditor.maxFileSizeMB",
              description:
                "Set the maximum allowed file size for uploads in megabytes. Default is 1 MB. 0 means no limit.",
            },
            {
              type: "select",
              selectorCommand: "FileColumnConfigEditor.contentMode",
              title: "Content filter mode",
              description:
                "Choose how to filter accepted files: by file extension, basic content type (e.g., image, audio, vide), by specific content type (e.g., image/png), by specific extension (jpg, png, pdf).",
            },
          ],
        },
        {
          type: "button",
          selectorCommand: "CreateFileColumn.confirm",
          title: "Create file column",
          description: "Confirms and creates the new file column.",
        },
      ],
    },
  ],
} satisfies UIDoc;
