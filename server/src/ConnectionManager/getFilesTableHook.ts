import type { BeforeEachTsTrigger, DBHandlerServer } from "prostgles-server";
import {
  extractFileText,
  type FileTextExtractionOptions,
  type FileTableRowWithExtraction,
} from "./extractFileText";
import type { ProstglesContext } from "@src/schemaConfig";

export const getFilesTableHook = (
  fileTableName: string,
  extractTextOptions?: FileTextExtractionOptions,
) => ({
  [fileTableName]: {
    beforeEach: [
      {
        commands: { insert: 1, update: 1 },
        validate: ({ data: fileRow, hookContext, onCommit }) => {
          const { original_name, content_type } = fileRow;
          const buffer = hookContext?.data as Buffer | undefined;
          const isImageOrPdf =
            content_type &&
            ["image/", "application/pdf"].some((prefix) =>
              content_type.startsWith(prefix),
            );
          if (
            !isImageOrPdf ||
            !original_name ||
            !buffer ||
            typeof fileRow.id !== "string"
          ) {
            return;
          }
          const fileId = fileRow.id;
          const start = new Date().toISOString();

          const { extraction_status } = extractFileText({
            buffer,
            contentType: content_type,
            onCommit,
            fileId,
            fileTableName,
            start,
            options: extractTextOptions,
          });

          return {
            row: {
              ...fileRow,
              extraction_status,
              docling_metadata: null,
              text_content: null,
            },
          };
        },
      } satisfies BeforeEachTsTrigger<
        FileTableRowWithExtraction,
        DBHandlerServer,
        ProstglesContext
      >,
    ],
  },
});
