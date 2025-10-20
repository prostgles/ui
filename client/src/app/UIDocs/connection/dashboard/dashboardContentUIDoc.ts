import { fixIndent } from "../../../../demo/scripts/sqlVideoDemo";
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
    "Main content area of the dashboard, where the SQL editor and other components are displayed.",
  docs: fixIndent(`
    The workspace area is where you interact with your database connection. 
    It includes the SQL editor, data tables, maps, and timecharts, allowing you to execute queries, visualize data, and manage database objects.`),
  children: [sqlEditorUIDoc, tableUIDoc, mapUIDoc, timechartUIDoc],
} satisfies UIDocElement;
