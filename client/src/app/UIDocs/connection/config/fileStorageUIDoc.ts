import { mdiImage } from "@mdi/js";
import type { UIDoc } from "../../../UIDocs";

export const fileStorageUIDoc = {
  type: "tab",
  selectorCommand: "config.files",
  title: "File storage",
  description:
    "Configure file upload and storage settings for this connection.",
  docOptions: "asSeparateFile",
  iconPath: mdiImage,
  docs: `
    Configure file upload and storage settings for this connection.

    <img src="/screenshots/file_storage.svg" alt="File Storage Configuration" />
  `,
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
