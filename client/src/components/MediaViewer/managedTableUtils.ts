import type {
  annotationsTableColumns,
  fileTableExtractionColumns,
} from "@common/managedTableSchema";
import type { FileTableRow, TableRowFromTableConfig } from "prostgles-types";
import type { DoclingDocument } from "src/dashboard/AskLLM/Chat/AskLLMChatMessages/ProstglesToolUseMessage/ProstglesMCPTools/DoclingConvertedDocument/DoclingDocument";

export type AnnotationsTableRow = TableRowFromTableConfig<{
  columns: typeof annotationsTableColumns;
}>;

export type FileTableRowExtraction = TableRowFromTableConfig<
  typeof fileTableExtractionColumns
>;

export type FilesTableRow = Pick<
  FileTableRow,
  "data" | "original_name" | "content_type" | "version"
> &
  Partial<Pick<FileTableRow, "url" | "id" | "original_last_modified">> & {
    docling_metadata: null | DoclingDocument;
    text_content: null | string[];
  } & FileTableRowExtraction;

export const FILE_TABLE_SELECT = {
  id: 1,
  original_last_modified: 1,
  original_name: 1,
  content_type: 1,
  extraction_status: 1,
} satisfies Partial<Record<keyof FilesTableRow, 1>>;

export type DBManagedTableSchema = {
  files: {
    columns: FilesTableRow;
  };
  file_annotations: {
    columns: AnnotationsTableRow;
  };
  files_versions: {
    columns: FilesTableRow & { file_id: string };
  };
};
