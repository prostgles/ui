import { doclingTimingsSchema } from "./documentsServiceOutputSchema";
import type { DBSSchema } from "./publishUtils";
import type { RequiredKeepUndefined } from "./utils";

export const auditTrailFilterColumns = [
  "schema_name",
  "table_name",
  "old_id",
  "new_id",
] as const;

export type ClientTableAuditConfig =
  | { error: string }
  | {
      tableName: string;
      idColumns: readonly string[];
    };

export type TableOptions = RequiredKeepUndefined<
  NonNullable<
    NonNullable<DBSSchema["connections"]["table_options"]>[string]
  > & {
    label: string;
    managedTableType?: "files" | "file-annotations";
  }
> & { audit?: ClientTableAuditConfig };

export type InternalColumnFormat = {
  type: "Internal";
  params:
    | { component: "File" }
    | {
        component: "FileAnnotation";
        tableName: string;
        dataKey: string;
      }
    | { component: "FileExtractionStatus" };
};

export type ColumnOptions = RequiredKeepUndefined<
  NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<DBSSchema["connections"]["table_options"]>[string]
      >["columns"]
    >[string]
  >
> & {
  defaultRenderAs?: InternalColumnFormat;
};

export const annotationsTableColumns = {
  id: `INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`,
  file_id: `UUID NOT NULL`,
  name: `TEXT`,
  text: `TEXT NOT NULL`,
  page: "INTEGER NOT NULL CHECK (page >= 1)",
  end_page: "INTEGER CHECK (end_page >= page)",
  start_text: "TEXT",
  end_text: "TEXT",
  fallback_edges: {
    nullable: true,
    jsonbSchema: {
      type: {
        start_x: "number",
        start_y: "number",
        end_x: "number",
        end_y: "number",
      },
    },
  },
  rectangles: {
    jsonbSchema: {
      arrayOfType: {
        x: "number",
        y: "number",
        width: "number",
        height: "number",
      },
    },
  },
} as const;

export const fileTableExtractionColumns = {
  columns: {
    text_content: `TEXT[]`,
    docling_metadata: `JSONB`,
    extraction_status: {
      nullable: true,
      jsonbSchema: {
        oneOfType: [
          {
            state: { enum: ["loading"] },
            start: "Date",
            options: { record: { values: "any" } },
          },
          {
            state: { enum: ["finished"] },
            start: "Date",
            end: "Date",
            options: { record: { values: "any" } },
            processing_time: "number",
            timings: doclingTimingsSchema,
          },
          {
            state: { enum: ["error"] },
            error: "unknown",
            start: "Date",
            end: "Date",
            options: { record: { values: "any" } },
          },
        ],
      },
    },
  },
} as const;
