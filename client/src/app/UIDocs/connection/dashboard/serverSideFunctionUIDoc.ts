import { fixIndent } from "../../../../demo/scripts/sqlVideoDemo";
import type { UIDocElement } from "../../../UIDocs";
import { getCommonViewHeaderUIDoc } from "../getCommonViewHeaderUIDoc";

export const serverSideFunctionUIDoc = {
  type: "section",
  selector: `.SilverGridChild[data-view-type="method"]`,
  title: "Server-side function view",
  description: "Allows executing server-side functions and viewing results.",
  entity: {
    tableName: "published_methods",
  },
  docs: fixIndent(`
    The server-side functions is an experimental feature that allows you to specify and execute server-side Typescript functions directly from the dashboard.`),
  children: [
    getCommonViewHeaderUIDoc(
      "Function name.",
      {
        children: [],
        title: "Server-side function view menu",
        description: "Server-side function menu",
        docs: fixIndent(`
          The server-side function view menu provides options for executing the function, viewing results, and managing function parameters.
          
        `),
      },
      "method",
    ),
  ],
} satisfies UIDocElement;
