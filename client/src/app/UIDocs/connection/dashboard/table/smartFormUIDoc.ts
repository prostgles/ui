import type { UIDocElement } from "src/app/UIDocs";

export const smartFormUIDoc: UIDocElement = {
  type: "popup",
  selectorCommand: "dashboard.window.viewEditRow",
  title: "View/edit data",
  description:
    "Opens the row card, allowing users to view/edit/delete the selected row.",
  docOptions: { title: "Row card" },
  docs: `
    Smart form is an intelligent, auto-generated form system that adapts to your database schema.
    It provides a user-friendly interface for inserting and updating data with automatic validation,
    foreign key handling, and support for complex data types.

    <img src="./screenshots/smart_form.svg" alt="SmartForm screenshot" />

    ## Features
    - **Auto-generated fields** based on table schema
    - **Data type validation** (text, numbers, dates, JSON, etc.)
    - **Foreign key support** with searchable dropdowns
    - **File upload** for media and document columns
    - **Linked data management** - insert related records inline
    - **JSON/JSONB editor** with syntax highlighting
    - **Geometry/Geography** support for spatial data
    - **Array types** with dynamic add/remove
    - **Default values** and constraints enforcement
    - **Required field** indicators
    - **Custom field rendering** based on column configuration

    ## Field Types
    - Text inputs (single/multi-line)
    - Number inputs (integer, decimal)
    - Date/Time/Timestamp pickers
    - Boolean checkboxes
    - Select dropdowns (enums, foreign keys)
    - File upload fields
    - JSON/JSONB editors
    - Geometry/Geography mappers
    - Array editors
 
  `,
  children: [
    {
      type: "section",
      selector: ".W_SmartForm",
      title: "Smart Form",
      description:
        "The smart form displays the details of a single row from the table, allowing users to view and edit the data in a structured format.",
      children: [
        {
          selectorCommand: "SmartForm.header.tableIconAndName",
          type: "section",
          title: "Table icon in header",
          children: [],
          description:
            "Table icon and table name. Table icon is configurable through the table menu settings.",
        },
        {
          selectorCommand: "SmartForm.header.previousRow",
          type: "button",
          title: "Previous row button",
          description:
            "Navigate to the previous row in the dataset. Only shown for tables with primary key. Disabled when there is no previous row available.",
        },
        {
          selectorCommand: "SmartForm.header.nextRow",
          type: "button",
          title: "Next row button",
          description:
            "Navigate to the next row in the dataset. Only shown for tables with primary key. Disabled when there is no next row available.",
        },
        {
          selectorCommand: "Popup.toggleFullscreen",
          type: "button",
          title: "Fullscreen toggle button",
          description:
            "Toggles the fullscreen mode of the SmartForm popup for an expanded view.",
        },
        {
          selectorCommand: "Popup.close",
          type: "button",
          title: "Close button",
          description: "Closes the SmartForm popup without saving any data.",
        },
        {
          type: "section",
          selector: ".form-field",
          title: "Form field",
          description:
            "Each form field represents a column from the table, displaying the column name and the corresponding value for the selected row. Users can edit the value if the field is editable.",
          children: [
            {
              type: "section",
              selector: "label",
              children: [],
              title: "Field label",
              description: "Displays the name of the column.",
            },
            {
              type: "section",
              selector: ".form-field__right-content-wrapper",
              title: "Field input area",
              description:
                "The input area where users can view and edit the value of the column. The input type varies based on the column's data type.",
              children: [],
            },
            {
              type: "section",
              selector: ".FormFieldHint",
              title: "Field hint",
              description:
                "Additional information or guidance about the field, displayed below the input area.",
              children: [],
            },
            {
              selectorCommand: "ViewMoreSmartCardList",
              type: "popup",
              title: "View more linked records",
              description:
                "For foreign key fields a 'View more' button appears to open a detailed list of all linked records in a separate popup. This is useful to browse and search all columns from the referenced table.",
              children: [],
            },
            {
              type: "popup",
              selectorCommand: "SmartFormFieldOptions.NestedInsert",
              title: "Insert linked record",
              description:
                "If the column is a foreign key a 'Insert new record' button will appear on hover which allows inserting data into the referenced table. Useful when the desired value does not exist yet (foreign key columns only show existing values).",
              children: [],
            },
            {
              selectorCommand: "FormField.clear",
              type: "button",
              title: "Clear field value button",
              description:
                "Clear the current value of the field, resetting it to null. Only shown if the field is nullable and the user is allowed to update it.",
            },
          ],
        },
        {
          selectorCommand: "JoinedRecords",
          type: "list",
          title: "Joined records section",
          description:
            "If the current table has other tables referencing it via foreign keys, a section will appear at the bottom of the form showing lists of those related records. This allows users to view and manage data that is linked to the current row.",
          itemSelector: "[data-command=JoinedRecords.Section]",
          itemContent: [
            {
              selectorCommand: "JoinedRecords.SectionToggle",
              type: "button",
              title: "Toggle joined records section",
              description:
                "Expand or collapse the joined records section to show or hide the list of related records.",
            },
            {
              selectorCommand: "ViewMoreSmartCardList",
              type: "popup",
              title: "View more joined records",
              description:
                "Open a detailed list of all joined records in a separate popup. Useful to browse and search all columns from the joined table.",
              children: [],
            },
            {
              selectorCommand: "JoinedRecords.AddRow",
              type: "popup",
              title: "Add joined record",
              description:
                "Open the SmartForm to insert a new joined record into the related table, automatically linking it to the current row.",
              children: [],
            },
            {
              selectorCommand: "Section.toggleFullscreen",
              type: "button",
              title: "Toggle fullscreen mode",
              description:
                "Expand the section to fullscreen for better visibility and interaction with the joined records.",
            },
          ],
        },
      ],
    },
  ],
};
