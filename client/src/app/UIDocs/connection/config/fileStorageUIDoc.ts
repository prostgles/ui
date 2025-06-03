import type { UIDoc } from "../../../UIDocs";

export const fileStorageUIDoc = {
  type: "tab",
  selectorCommand: "config.files",
  title: "File storage",
  description:
    "Configure file upload and storage settings for this connection.",
  children: [
    {
      type: "input",
      inputType: "checkbox",
      selectorCommand: "config.files.toggle",
      title: "Enable File Storage",
      description:
        "Enable file upload and storage capabilities for this connection.",
    },
  ],
} satisfies UIDoc;
