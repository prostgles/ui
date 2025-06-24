import { fixIndent } from "../../../../demo/sqlVideoDemo";
import {
  getCommandElemSelector,
  getDataKeyElemSelector,
} from "../../../../Testing";
import type { UIDocElement } from "../../../UIDocs";
import { getCommonViewHeaderUIDoc } from "../getCommonViewHeaderUIDoc";

export const sqlEditorUIDoc = {
  type: "section",
  selector: `.SilverGridChild[data-view-type="sql"]`,
  title: "SQL editor",
  description:
    "The SQL editor allows users to write and execute SQL queries against the selected database. It provides a user-friendly interface for interacting with the database.",
  docs: fixIndent(`
    The SQL editor is a powerful tool for executing SQL queries against your database. It supports syntax highlighting, auto-completion, and various options for managing queries.

    <img src="./screenshots/sql_editor.svg" alt="SQL editor screenshot" />
  `),
  asSeparateFile: true,
  children: [
    getCommonViewHeaderUIDoc(
      "SQL editor query name, editable in the menu.",
      {
        title: "SQL editor menu",
        description:
          "The SQL editor menu provides access to various options and settings for the SQL editor.",
        docs: fixIndent(`
          The SQL editor menu provides access to various options and settings for the SQL editor.`),
        children: [
          {
            type: "tab",
            selector:
              getCommandElemSelector("MenuList") +
              " " +
              getDataKeyElemSelector("General"),
            title: "General",
            description: "General settings for the SQL editor.",
            children: [
              {
                type: "input",
                inputType: "text",
                selectorCommand: "W_SQLMenu.name",
                title: "Query name",
                description:
                  "The name of the current SQL query. This is used for saving and managing queries.",
              },
              {
                type: "select",
                selectorCommand: "W_SQLMenu.renderDisplayMode",
                title: "Result display mode",
                description:
                  "The mode in which the results of the SQL query will be displayed. Options include table, JSON, and CSV.",
              },
              {
                type: "button",
                selectorCommand: "W_SQLMenu.saveQuery",
                title: "Save query as file",
                description:
                  "Saves the current SQL query to a file. This can also be accomplished by pressing Ctrl+S.",
              },
              {
                type: "button",
                selectorCommand: "W_SQLMenu.openSQLFile",
                title: "Open SQL file",
                description:
                  "This allows loading the contents of an SQL file into the current query.",
              },
              {
                selectorCommand: "W_SQLMenu.deleteQuery",
                type: "button",
                title: "Delete query",
                description:
                  "Deletes the current SQL query. If it has contents a confirmation dialog will appear.",
              },
            ],
          },
          {
            type: "tab",
            selector:
              getCommandElemSelector("MenuList") +
              " " +
              getDataKeyElemSelector("Editor options"),
            title: "Editor options",
            description:
              "Settings for the SQL editor's appearance and behavior.",
            children: [
              {
                type: "smartform",
                tableName: "windows",
                fieldNames: ["sql_options"],
                title: "Editor settings",
                selector:
                  getCommandElemSelector("Popup.content") + " .MonacoEditor",
                description:
                  "Settings for the SQL editor's appearance and behavior. This includes font size, theme, and other preferences.",
              },
            ],
          },
          {
            type: "tab",
            selector:
              getCommandElemSelector("MenuList") +
              " " +
              getDataKeyElemSelector("Hotkeys"),
            title: "Hotkeys",
            description:
              "Keyboard shortcuts for common actions in the SQL editor. This includes executing queries, saving files, and more.",
            children: [],
          },
        ],
      },
      "sql",
    ),
    {
      type: "section",
      selectorCommand: "W_SQLEditor",
      title: "SQL editor component",
      description:
        "The main component for the SQL editor. It contains the SQL editor and statement action buttons. Being bsed on Monaco editor, it supports syntax highlighting, auto-completion and other editing functionality like multi-cursor editing.",
      children: [
        {
          type: "input",
          inputType: "text",
          selectorCommand: "MonacoEditor",
          title: "SQL editor input",
          description:
            "The input field for writing SQL queries. It supports syntax highlighting and auto-completion.",
        },
        {
          type: "button",
          selectorCommand: "W_SQLEditor.executeStatement",
          title: "Execute current statement",
          description:
            "Executes the current SQL statement highlighted by the blue vertical line to the left of the code. This button is only visible when the cursor is within a statement.",
        },
        {
          type: "button",
          selectorCommand: "AddChartMenu.Timechart",
          title: "Add timechart",
          description:
            "Adds a timechart visualization based on the current SQL statement. This button is only visible when the cursor is within a statement that returns at least one timestamp column.",
        },
        {
          type: "button",
          selectorCommand: "AddChartMenu.Map",
          title: "Add map",
          description:
            "Adds a map visualization based on the current SQL statement. This button is only visible when the cursor is within a statement that returns at least one geometry/geography column (postgis extension must be enabled).",
        },
      ],
    },
    {
      type: "section",
      title: "SQL editor toolbar",
      description:
        "The toolbar provides various options for executing and managing SQL queries.",
      selectorCommand: "W_SQLBottomBar",
      children: [
        {
          type: "button",
          selectorCommand: "W_SQLBottomBar.runQuery",
          title: "Run query",
          description:
            "Executes the current SQL query. The result will be displayed in the query results section.",
        },
        {
          selectorCommand: "W_SQLBottomBar.limit",
          title: "Limit",
          type: "input",
          inputType: "number",
          description:
            "Sets the maximum number of rows to return in the query results. This is useful for limiting the amount of data returned, especially for large datasets.",
        },
        {
          type: "button",
          selectorCommand: "W_SQLBottomBar.cancelQuery",
          title: "Cancel query",
          description:
            "Cancels the currently running query. This button is only visible when a query is running.",
        },
        {
          type: "button",
          selectorCommand: "W_SQLBottomBar.terminateQuery",
          title: "Terminate query",
          description:
            "Forcefully terminates the currently running query. This is more aggressive than cancel and is only visible when a query is running.",
        },
        {
          type: "button",
          selectorCommand: "W_SQLBottomBar.stopListen",
          title: "Stop LISTEN",
          description:
            "Stops the active LISTEN operation. This button is only visible when a LISTEN query is active.",
        },
        {
          type: "text",
          selectorCommand: "W_SQLBottomBar.rowCount",
          title: "Row count",
          description:
            "Displays the number of rows fetched by the query and the total number of rows if available.",
        },
        {
          type: "button",
          selectorCommand: "W_SQLBottomBar.toggleTable",
          title: "Toggle table visibility",
          description:
            "Shows or hides the results table for the executed query.",
        },
        {
          type: "button",
          selectorCommand: "W_SQLBottomBar.toggleCodeEditor",
          title: "Toggle code editor",
          description:
            "Shows or hides the SQL code editor, allowing users to focus on query results when needed.",
        },
        {
          type: "button",
          selectorCommand: "W_SQLBottomBar.toggleNotices",
          title: "Toggle notices",
          description:
            "Shows or hides database notices. When enabled, it displays notifications from the database system.",
        },
        {
          type: "section",
          selectorCommand: "W_SQLBottomBar.queryDuration",
          title: "Query duration",
          children: [],
          description:
            "Displays the execution time of the last completed query or the current running time for an active query.",
        },
        {
          type: "select",
          selectorCommand: "W_SQLBottomBar.copyResults",
          title: "Copy results",
          description:
            "Copy/download query results as: CSV, TSV, JSON, Typescript definition, SQL SELECT INTO",
        },
        {
          type: "text",
          selectorCommand: "W_SQLBottomBar.sqlError",
          title: "SQL error",
          description:
            "Displays any errors that occurred during the execution of the SQL query. This is useful for debugging and correcting SQL syntax.",
        },
      ],
    },
    {
      type: "section",
      selectorCommand: "W_SQLResults",
      title: "Query results",
      description:
        "Displays the results of the executed SQL query. Results can be displayed as a table (default), JSON or CSV. Users can interact with the results, such as sorting and filtering.",
      children: [
        {
          type: "section",
          selector: ".table-component",
          title: "Results table",
          description:
            "The results table displays the data returned by the executed SQL query. It supports sorting, filtering, and pagination.",
          children: [],
        },
        {
          type: "section",
          selectorCommand: "Window.ChildChart",
          title: "Chart",
          description: "Timechart/Map visualization of the SQL query results.",
          children: [],
        },
      ],
    },
  ],
} satisfies UIDocElement;
