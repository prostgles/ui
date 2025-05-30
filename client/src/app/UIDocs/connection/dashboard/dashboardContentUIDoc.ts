import type { UIDocElement } from "../../../UIDocs";
import { mapUIDoc } from "./mapUIDoc";
import { sqlEditorUIDoc } from "./sqlEditorUIDoc";
import { tableUIDoc } from "./table/tableUIDoc";
import { timechartUIDoc } from "./timechartUIDoc";

export const dashboardContentUIDoc = {
  type: "section",
  selector: ".Dashboard_MainContentWrapper",
  title: "Dashboard content",
  description:
    "Main content area of the dashboard, where the SQL editor and other components are displayed.",
  children: [sqlEditorUIDoc, tableUIDoc, mapUIDoc, timechartUIDoc],
} satisfies UIDocElement;
