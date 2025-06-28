import { fixIndent } from "../../../../../demo/sqlVideoDemo";
import { getDataKeyElemSelector } from "../../../../../Testing";
import type { UIDocElement } from "../../../../UIDocs";

export const smartFilterBarUIDoc = {
  type: "section",
  selectorCommand: "SmartFilterBar",
  title: "Table Toolbar",
  description:
    "Filtering and data add/edit interface for database tables and views.",
  docs: fixIndent(`
    Table toolbar can be toggled through the show/hide filtering button (top left corner). 
    It provides a user-friendly interface to add filters, search for data, and perform various actions on the table data.
    
    <img src="./screenshots/smart_filter_bar.svg" alt="Smart Filter Bar screenshot" />
  `),
  children: [
    {
      type: "popup",
      selectorCommand: "SmartAddFilter",
      title: "Add Filter",
      description:
        "Allows adding a filter by chosing a column from the current table or from linked tables.",
      children: [
        {
          type: "button",
          selectorCommand: "SmartAddFilter.toggleIncludeLinkedColumns",
          title: "Include Linked Columns",
          description:
            "Toggle to include columns from linked tables in the column list.",
        },
        {
          type: "button",
          selectorCommand: "SmartAddFilter.JoinTo",
          title: "Join To",
          description:
            "Toggles join view to specify which tables a join path to a specific table from which to select a column to filter by.",
        },
        {
          type: "list",
          selector: ".SearchList",
          title: "Filterable Columns",
          description:
            "List of columns available for filtering. Click to add a filter.",
          itemSelector: "li",
          itemContent: [],
        },
      ],
    },
    {
      type: "section",
      selectorCommand: "SearchList",
      title: "Search Bar",
      description: "Quick search functionality across the table data.",
      children: [
        {
          type: "input",
          inputType: "text",
          selector: ".SmartSearch input",
          title: "Search",
          description:
            "Type to search across all searchable fields in the table. The search is a simple contains search. Selecting a result will add a filter to the table.",
        },
        {
          type: "button",
          selectorCommand: "SearchList.MatchCase",
          title: "Match Case",
          description:
            "Toggle to match the case of the search term with the data.",
        },
      ],
    },
    {
      type: "section",
      selector: ".SmartFilterBarRightActions",
      title: "Table actions",
      description: "Additional table data actions.",
      children: [
        {
          type: "button",
          selectorCommand: "SmartFilterBar.rightOptions.show",
          title: "Show additional actions",
          description:
            "Opens a menu with additional actions for the table data.",
        },
        {
          selectorCommand: "SmartFilterBar.rightOptions.delete",
          type: "popup",
          title: "Delete action",
          description:
            "Opens a menu to delete the selected rows from the table.",
          children: [],
        },
        {
          selectorCommand: "SmartFilterBar.rightOptions.update",
          type: "popup",
          title: "Update action",
          description: "Opens a menu to update the selected rows in the table.",
          children: [],
        },
        {
          selectorCommand: "dashboard.window.rowInsertTop",
          type: "popup",
          title: "Insert row",
          description:
            "Opens the row insert menu, allowing users to add new rows to the table.",
          children: [],
        },
      ],
    },
    {
      type: "section",
      title: "Filters",
      description: "Filters applied to the data",
      selector: getDataKeyElemSelector("where"),
      children: [],
    },
    {
      type: "section",
      title: "Having Filters",
      description: "Filters applied after aggregation (HAVING clause in SQL).",
      selector: getDataKeyElemSelector("having"),
      children: [],
    },
  ],
} satisfies UIDocElement;
