import type { UIDocElement } from "../../../UIDocs";
import { mapUIDoc } from "./mapUIDoc";
import { sqlEditorUIDoc } from "./sqlEditorUIDoc";
import { tableUIDoc } from "./table/tableUIDoc";
import { timechartUIDoc } from "./timechartUIDoc";

export const dashboardContentUIDoc = {
  type: "section",
  selector: ".Dashboard_MainContentWrapper",
  title: "Workspace area",
  description:
    "Main content area of the dashboard, where the tables, views, SQL editors and other visualisations are displayed.",
  docs: `
    The workspace area is the main place for interacting with your data. 
    It includes the SQL editor, data tables, maps, and timecharts, allowing you to execute queries, visualize data, and manage database objects.
    
    ## Features

    - **Flexible layout**: Arrange your workspace with multiple tabs and split views to compare data, write queries, and visualize results side by side.
    - **AI assistant**: Automate tasks, write queries, create visualizations, and explore your data with natural language commands.
    - **Views and visualizations**: Create different views for your data, including tables, maps, and timecharts, to explore and analyze your data in various ways.
    - **SQL editor**: Write and execute SQL queries directly in the dashboard, with features like syntax highlighting, autocomplete, and query history to enhance your productivity.
    - **Real-time updates**: Each table/view shows real-time data by default
    - **Cross-filtering**: Tables, maps, and timecharts stay cross-filtered when opened from the same source data, allowing you to explore your data from different angles while keeping the context.
    `,
  children: [sqlEditorUIDoc, tableUIDoc, mapUIDoc, timechartUIDoc],
} satisfies UIDocElement;
