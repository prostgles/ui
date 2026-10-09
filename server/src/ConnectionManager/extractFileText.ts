import type { documentsServiceInputSchema } from "@common/mcp/documentsServiceInputSchema";
import { CONVERT_DOCUMENT_DEFAULT_OPTIONS } from "@src/ServiceManager/services/documents/documents.service";
import type { fileTableExtractionColumns } from "@common/managedTableSchema";
import type { ProstglesContext } from "@src/schemaConfig";
import { buffer } from "node:stream/consumers";
import { createJobDefiner, type FileTableRow } from "prostgles-server";
import type { FileTableConfig } from "prostgles-server/dist/ProstglesTypes";
import { getFileStorageKey } from "prostgles-server/dist/StorageClient/getFileStorageKey";
import type { TableRowFromColumnDefinitions } from "prostgles-server/dist/TableConfig/TableRowFromColumnDefinitions";
import {
  getSerialisableError,
  type JSONB,
  type TableHandlerForColumns,
} from "prostgles-types";

export const getFileTextExtractionJob = (fileTable: FileTableConfig) => {
  const maxAttempts = 3;
  return createJobDefiner<void, ProstglesContext>()({
    trigger: {
      type: "row",
      table: fileTable.tableName,
      on: ["insert", "update"],
      columns: ["extraction_status"],
      jobIdColumn: "extraction_job_id",
      when: { extraction_status: { "@>": { state: "loading" } } },
    },
    retry: { maxAttempts, backoff: "exponential", delayMs: 1000 },
    concurrency: 1,
    run: async ({ row, dbo, context, run, signal }) => {
      const file = row as FileTableRowWithExtraction;
      if (file.extraction_status?.state !== "loading" || file.extraction_job_id !== run.id) return;
      const { start, options } = file.extraction_status;
      const extractionOptions = getFileTextExtractionOptions(options);
      const files = dbo[fileTable.tableName] as TableHandlerForColumns<FileTableRowWithExtraction>;
      const filter = {
        id: file.id,
        extraction_job_id: run.id,
      };
      try {
        const documentService =
          await context.serviceManager.getServiceWithRetries("documents");
        const data = await buffer(
          await fileTable.storageClient.downloadAsStream(getFileStorageKey(file)),
        );
        const result = await documentService.endpoints["/v1/convert/file"]({
          files: [new Blob([data], { type: file.content_type })],
          ...extractionOptions,
        }, { signal });
        signal.throwIfAborted();
        await files.update(filter, {
          extraction_status: {
            state: "finished",
            start,
            options: extractionOptions,
            end: new Date().toISOString(),
            processing_time: result.processing_time,
            timings: result.timings,
          },
          docling_metadata: result.document.json_content,
          text_content: result.document.md_content
            ?.split(extractionOptions.md_page_break_placeholder)
            .map((page) => page.trim()) ?? null,
        });
      } catch (error) {
        if (run.attempt >= maxAttempts && !signal.aborted) {
          await files.update(filter, {
            extraction_status: {
              state: "error",
              error: getSerialisableError(error) ?? "Unknown error during document extraction",
              options: extractionOptions,
              start,
              end: new Date().toISOString(),
            },
          });
        }
        throw error;
      }
    },
  });
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
    // Both outputs are required to populate the managed extraction columns.
    to_formats: DEFAULT_EXTRACTION_OPTIONS.to_formats,
  }) satisfies Partial<JSONB.GetType<typeof documentsServiceInputSchema>>;
