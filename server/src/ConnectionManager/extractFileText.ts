import type { documentsServiceInputSchema } from "@common/mcp/documentsServiceInputSchema";
import { CONVERT_DOCUMENT_DEFAULT_OPTIONS } from "@src/ServiceManager/services/documents/documents.service";
import type { DBHandlerServer } from "prostgles-server";
import type { fileTableExtractionColumns } from "@common/managedTableSchema";
import type { FileTableRow } from "prostgles-server";
import type { TableRowFromColumnDefinitions } from "prostgles-server/dist/TableConfig/TableRowFromColumnDefinitions";
import {
  getSerialisableError,
  type JSONB,
  type TableHandlerForColumns,
} from "prostgles-types";
import { getServiceManager } from "@src/ServiceManager/getServiceManager";

type FileTableExtractionRow = TableRowFromColumnDefinitions<
  (typeof fileTableExtractionColumns)["columns"]
>;

export type FileTableRowWithExtraction = FileTableRow &
  Omit<FileTableExtractionRow, "text_content"> & {
    text_content: string[] | null;
  };

const EXTRACTION_OPTIONS = {
  ...CONVERT_DOCUMENT_DEFAULT_OPTIONS,
  to_formats: ["json", "md"],
  md_page_break_placeholder: "<!-- PROSTGLES_PAGE_BREAK -->",
} as const satisfies Partial<JSONB.GetType<typeof documentsServiceInputSchema>>;

export const extractFileText = ({
  buffer,
  contentType,
  onCommit,
  fileId,
  fileTableName,
  start,
}: {
  buffer: Buffer;
  contentType: string;
  onCommit: (cb: (args: { dbo: DBHandlerServer }) => void) => void;

  fileId: string;
  fileTableName: string;
  start: string;
}) => {
  let doclingMetadata: Record<string, unknown> | null = null;
  let markdownPages: string[] | null = null;
  let extraction_status: FileTableRowWithExtraction["extraction_status"] = {
    state: "loading",
    start,
    options: EXTRACTION_OPTIONS,
  };
  onCommit(({ dbo }) => {
    void (async () => {
      try {
        const documentService =
          await getServiceManager().getServiceWithRetries("documents");
        const result = await documentService.endpoints["/v1/convert/file"]({
          files: [new Blob([buffer], { type: contentType })],
          ...EXTRACTION_OPTIONS,
        });
        doclingMetadata = result.document.json_content;
        markdownPages =
          result.document.md_content
            ?.split(EXTRACTION_OPTIONS.md_page_break_placeholder)
            .map((page) => page.trim()) ?? null;
        extraction_status = {
          state: "finished",
          start,
          options: EXTRACTION_OPTIONS,
          end: new Date().toISOString(),
        };
      } catch (error) {
        extraction_status = {
          state: "error",
          error:
            getSerialisableError(error) ??
            "Unknown error during document extraction",
          options: EXTRACTION_OPTIONS,
          start,
          end: new Date().toISOString(),
        };
      }

      await (
        dbo[fileTableName] as TableHandlerForColumns<FileTableRowWithExtraction>
      ).update(
        {
          id: fileId,
          extraction_status: { "@>": { start } },
        },
        {
          extraction_status,
          docling_metadata: doclingMetadata,
          text_content: markdownPages,
        },
      );
    })().catch((error) => {
      console.error("Error during file text extraction:", error);
    });
  });

  return { extraction_status };
};
