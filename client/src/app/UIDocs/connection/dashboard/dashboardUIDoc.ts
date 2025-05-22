import type { UIDocElement } from "../../../UIDocs";
import { sqlEditorUIDoc } from "./sqlEditorUIDoc";
import { tableUIDoc } from "./tableUIDoc";

export const dashboardUIDoc = {
  type: "section",
  selector: ".Dashboard_MainContentWrapper",
  title: "Dashboard content",
  description:
    "Main content area of the dashboard, where the SQL editor and other components are displayed.",
  children: [sqlEditorUIDoc, tableUIDoc],
} satisfies UIDocElement;
