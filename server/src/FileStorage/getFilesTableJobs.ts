import {
  CONVERTABLE_DOCUMENT_TYPES,
  CONVERTABLE_IMAGE_TYPES,
} from "@common/mcp/documents.mcp.schema";
import type { documentsServiceInputSchema } from "@common/mcp/documentsServiceInputSchema";
import { CONVERT_DOCUMENT_DEFAULT_OPTIONS } from "@src/ServiceManager/services/documents/documents.service";
import type { fileTableExtractionColumns } from "@common/managedTableSchema";
import type { ProstglesContext } from "@src/schemaConfig";
import { buffer } from "node:stream/consumers";
import { createJobDefiner, type FileTableRow } from "prostgles-server";
import type { FileTableConfig } from "prostgles-server/dist/ProstglesTypes";
import { getFileStorageKey } from "prostgles-server/dist/StorageClient/getFileStorageKey";
import type { TableRowFromColumnDefinitions } from "prostgles-server/dist/TableConfig/TableRowFromColumnDefinitions";
import { type JSONB, type TableHandlerForColumns } from "prostgles-types";
import {
  getAnnotationPageText,
  type AnnotationDocument,
} from "./getAnnotationPageText";

export const getFilesTableJobs = (
  fileTable: FileTableConfig,
  extractTextOptions: FileTextExtractionOptions | undefined,
) => {
  const extractFileText = createJobDefiner<void, ProstglesContext>()({
    trigger: {
      type: "row",
      table: fileTable.tableName,
      on: ["insert", "update"],
      columns: ["storage_key"],
      jobIdColumn: "text_extraction_job_id",
      when: {
        content_type: {
          $in: [...CONVERTABLE_DOCUMENT_TYPES, ...CONVERTABLE_IMAGE_TYPES],
        },
      },
    },
    params: {
      options: {
        jsonbSchema: { record: { values: "any" } },
        default: getFileTextExtractionOptions(extractTextOptions),
      },
    },
    retry: { maxAttempts: 1 },
    concurrency: 1,
    run: async ({ row, dbo, context, run, signal, params }) => {
      const file = row as FileTableRowWithExtraction;
      if (file.text_extraction_job_id !== run.id) return;
      const extractionOptions = getFileTextExtractionOptions(params.options);
      const files = dbo[
        fileTable.tableName
      ] as TableHandlerForColumns<FileTableRowWithExtraction>;
      const filter = {
        id: file.id,
        text_extraction_job_id: run.id,
      };
      const documentService =
        await context.serviceManager.getServiceWithRetries("documents");
      const data = await buffer(
        await fileTable.storageClient.downloadAsStream(getFileStorageKey(file)),
      );
      const result = await documentService.endpoints["/v1/convert/file"](
        {
          files: [
            new File([data], file.original_name, { type: file.content_type }),
          ],
          ...extractionOptions,
        },
        { signal },
      );
      signal.throwIfAborted();
      const document: AnnotationDocument | null = result.document.json_content;
      const pageCount = Math.max(
        0,
        ...Object.keys(document?.pages ?? {}).map(Number),
      );
      await files.update(filter, {
        docling_metadata: document,
        text_content:
          document && pageCount ?
            Array.from({ length: pageCount }, (_, pageIndex) =>
              document.pages[pageIndex + 1] ?
                getAnnotationPageText(document, pageIndex + 1).text
              : "",
            )
          : (result.document.md_content
              ?.split(extractionOptions.md_page_break_placeholder)
              .map((page) => page.trim()) ?? null),
      });
      return {
        processing_time: result.processing_time,
        timings: result.timings,
      };
    },
  });

  return extractFileText;
};

type FileTableExtractionRow = TableRowFromColumnDefinitions<
  (typeof fileTableExtractionColumns)["columns"]
>;

export type FileTableRowWithExtraction = FileTableRow &
  Omit<FileTableExtractionRow, "text_content"> & {
    text_content: string[] | null;
  };

const DEFAULT_EXTRACTION_OPTIONS = {
  ...CONVERT_DOCUMENT_DEFAULT_OPTIONS,
  to_formats: ["json", "md"],
  md_page_break_placeholder: "<!-- PROSTGLES_PAGE_BREAK -->",
} as const satisfies Partial<JSONB.GetType<typeof documentsServiceInputSchema>>;

export type FileTextExtractionOptions = Omit<
  Partial<JSONB.GetType<typeof documentsServiceInputSchema>>,
  "to_formats"
>;

export const getFileTextExtractionOptions = (
  options?: FileTextExtractionOptions,
) =>
  ({
    ...DEFAULT_EXTRACTION_OPTIONS,
    ...options,
    /* Markdown remains available for documents without page metadata. */
    to_formats: DEFAULT_EXTRACTION_OPTIONS.to_formats,
  }) satisfies Partial<JSONB.GetType<typeof documentsServiceInputSchema>>;
