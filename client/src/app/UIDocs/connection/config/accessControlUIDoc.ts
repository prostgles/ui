import { fixIndent } from "../../../../demo/sqlVideoDemo";
import type { UIDoc } from "../../../UIDocs";

export const accessControlUIDoc = {
  type: "tab",
  selectorCommand: "config.ac",
  title: "Access control",
  description:
    "Manage user permissions and access rules for this database connection.",
  docs: fixIndent(`
    Manage user permissions and access rules for this database connection.
    <img src="./screenshots/access_control.svg" alt="Access control" />
  `),
  asSeparateFile: true,
  children: [
    {
      type: "button",
      selectorCommand: "config.ac.create",
      title: "Create Access Rule",
      description: "Add a new access control rule to define user permissions.",
    },
    {
      type: "button",
      selectorCommand: "config.ac.save",
      title: "Save Access Rule",
      description: "Save changes to the current access control rule.",
    },
    {
      type: "button",
      selectorCommand: "config.ac.cancel",
      title: "Cancel Changes",
      description: "Cancel editing the current access control rule.",
    },
    {
      type: "button",
      selectorCommand: "config.ac.removeRule",
      title: "Remove Rule",
      description: "Delete the selected access control rule.",
    },
  ],
} satisfies UIDoc;
