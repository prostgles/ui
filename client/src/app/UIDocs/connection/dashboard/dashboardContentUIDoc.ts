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
    It includes the SQL editor, data tables, maps, and timecharts, allowing you to execute queries, visualize data, and manage database objects.`,
  children: [sqlEditorUIDoc, tableUIDoc, mapUIDoc, timechartUIDoc],
} satisfies UIDocElement;
