import type { UIDoc } from "src/app/UIDocs";
import { getDataKeyElemSelector } from "src/Testing";

export const columnMenuUIDoc = {
  type: "popup",
  title: "Column menu",
  triggerMode: "contextmenu",
  selector: `[role="columnheader"]`,
  description:
    "Opens the column menu, allowing users to change styling, render mode, view quick stats and other column related options.",
  children: [
    {
      type: "tab",
      title: "Sort",
      description:
        "Sort the table data based on the values in this column, either in ascending or descending order. Table can also be sorted by multiple columns by holding shift while clicking column headers.",
      selector: getDataKeyElemSelector("Sort"),
      children: [],
    },
    {
      type: "tab",
      title: "Style",
      description:
        "Customize the appearance of this column, including text color and cell background. You can also set conditional formatting rules to highlight specific data patterns.",
      selector: getDataKeyElemSelector("Style"),
      children: [],
    },
    {
      type: "tab",
      title: "Display format",
      description:
        "Choose how the data in this column is displayed, such as date formats, number formats, or custom render modes.",
      selector: getDataKeyElemSelector("Display format"),
      children: [],
    },
    {
      type: "button",
      title: "Filter",
      description:
        "Open the filter panel to set up filters based on this column's values, helping you to quickly narrow down the data displayed in the table.",
      selector: getDataKeyElemSelector("Filter"),
    },
    {
      type: "tab",
      title: "Quick stats",
      description:
        "View quick statistics about the data in this column, such as count, unique values, and distribution.",
      selector: getDataKeyElemSelector("Quick stats"),
      children: [
        {
          type: "section",
          title: "Column Quick Stats",
          description:
            "The Column Quick Stats panel provides a summary of key statistics for the selected column, including distinct count, min/max values, and value distribution. You can also sort the distribution and add filters directly from this panel.",
          selectorCommand: "ColumnQuickStats",
          children: [
            {
              type: "button",
              title: "Add filter",
              description:
                "Add a filter based on the selected value from top values list.",
              selectorCommand: "ColumnQuickStats.addFilter",
            },
          ],
        },
      ],
    },
    {
      type: "tab",
      title: "Columns",
      description:
        "Shortcut to the column management panel to add, remove, or rearrange columns in the table.",
      selector: getDataKeyElemSelector("Columns"),
      children: [],
    },
    {
      type: "tab",
      title: "Add Computed Column",
      description:
        "Add a computed field based on calculations or transformations of existing data in this column.",
      selector: getDataKeyElemSelector("Add Computed Column"),
      children: [],
    },
    {
      type: "tab",
      title: "Apply function",
      description:
        "Apply a function to the data in this column, such as aggregations, string manipulations, or date transformations.",
      selector: getDataKeyElemSelector("Apply function"),
      children: [],
    },
    {
      type: "tab",
      title: "Add Linked Columns",
      description:
        "Add linked data from related tables based on foreign key relationships.",
      selector: getDataKeyElemSelector("Add Linked Columns"),
      children: [],
    },
    {
      type: "tab",
      title: "Alter",
      description:
        "Alter the column's properties, such as data type, default value, or constraints.",
      selector: getDataKeyElemSelector("Alter"),
      children: [],
    },
    {
      type: "button",
      title: "Hide",
      description:
        "Hide this column from the table view without deleting it, allowing you to focus on the most relevant data.",
      selector: getDataKeyElemSelector("Hide"),
    },
    {
      type: "button",
      title: "Hide Others",
      description:
        "Hide all other columns except this one, providing a focused view of the data in this column.",
      selector: getDataKeyElemSelector("Hide Others"),
    },
  ],
} satisfies UIDoc;
