import type {
  BeforeEachTsTrigger,
  DBHandlerServerInternal,
} from "prostgles-server";
import type { FileTableRowWithExtraction } from "./getFilesTableJobs";
import type { ProstglesContext } from "@src/schemaConfig";

export const getFilesTableTextExtractionHook = (fileTableName: string) => ({
  [fileTableName]: {
    beforeEach: [
      {
        commands: { insert: 1, update: 1 },
        validate: ({ data: fileRow, hookContext }) => {
          if (!hookContext?.data) return;

          return {
            row: {
              ...fileRow,
              text_extraction_job_id: null,
              docling_metadata: null,
              text_content: null,
            },
          };
        },
      } satisfies BeforeEachTsTrigger<
        FileTableRowWithExtraction,
        DBHandlerServerInternal,
        ProstglesContext
      >,
    ],
  },
});
