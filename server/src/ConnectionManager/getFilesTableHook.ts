import type { BeforeEachTsTrigger, DBHandlerServer } from "prostgles-server";
import {
  getFileTextExtractionOptions,
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
        validate: ({ data: fileRow, hookContext }) => {
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
            !buffer
          ) {
            return;
          }

          return {
            row: {
              ...fileRow,
              extraction_status: {
                state: "loading",
                start: new Date().toISOString(),
                options: getFileTextExtractionOptions(extractTextOptions),
              },
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
