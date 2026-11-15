import type { AuditTableRow } from "prostgles-types";
import type { ActionColumnsParams } from "./actionColumn";
import type { ColumnConfig } from "./ColumnConfig/ColumnConfig";
import type { DBSSchema } from "./publishUtils";
import type { RequiredKeepUndefined } from "./utils";

export const auditActorJoinName = "prostgles_audit_actor";

export const auditTrailFilterColumns = [
  "schema_name",
  "table_name",
  "old_id",
  "new_id",
] as const satisfies readonly (keyof AuditTableRow)[];

export type ClientTableAuditConfig =
  | { error: string }
  | {
      tableName: string;
      idColumns: readonly string[];
    };

type ConnectionTableOptions = NonNullable<
  NonNullable<DBSSchema["connections"]["table_options"]>[string]
>;

export type TableOptions = RequiredKeepUndefined<
  Omit<ConnectionTableOptions, "columns"> & {
    columns?: Partial<
      Record<
        string,
        NonNullable<NonNullable<ConnectionTableOptions["columns"]>[string]> & {
          defaultRenderAs?: InternalColumnFormat;
        }
      >
    >;
    label: string;
    managedTableType?:
      "files" | "file-annotations" | "alerts" | "alert-deliveries" | "audit";
  }
> & {
  audit?: ClientTableAuditConfig;
  defaultColumns?: string[];
};

export type ClientTableOptions = Omit<TableOptions, "columns"> & {
  columnConfigs?: Record<string, Omit<ColumnConfig, "name">>;
};

export type InternalColumnFormat = {
  type: "Internal";
  params:
    | { component: "File"; dataKey: string }
    | {
        component: "FileAnnotation";
        tableName: string;
        dataKey: string;
      }
    | { component: "Alert"; field: AlertFieldName }
    | ({ component: "ActionColumns"; dataKey: string } & ActionColumnsParams);
};

export const alertFieldNames = [
  "definition",
  "schedule",
  "user_filter",
  "channels",
] as const;
export type AlertFieldName = (typeof alertFieldNames)[number];

export type ColumnOptions = RequiredKeepUndefined<
  Pick<
    NonNullable<
      NonNullable<
        NonNullable<
          NonNullable<DBSSchema["connections"]["table_options"]>[string]
        >["columns"]
      >[string]
    >,
    "icon" | "renderAs" | "style"
  >
> & {
  defaultRenderAs?: InternalColumnFormat;
};

export const DEFAULT_ANNOTATION_COLOR = "var(--light-blue)";

export const annotationsTableColumns = {
  id: `INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`,
  file_id: `UUID NOT NULL`,
  file_version: "INTEGER CHECK (file_version >= 1)",
  name: `TEXT`,
  color: `TEXT NOT NULL DEFAULT '${DEFAULT_ANNOTATION_COLOR}'`,
  text: `TEXT NOT NULL DEFAULT ''`,
  page: "INTEGER NOT NULL DEFAULT 1 CHECK (page >= 1)",
  end_page: "INTEGER CHECK (end_page >= page)",
  start_text: "TEXT",
  end_text: "TEXT",
  text_selections: {
    defaultValue: "[]",
    jsonbSchema: {
      arrayOfType: {
        page: "integer",
        startText: "string",
        endText: "string",
        rects: {
          optional: true,
          arrayOfType: {
            x: "number",
            y: "number",
            width: "number",
            height: "number",
          },
        },
        bounds: {
          optional: true,
          arrayOfType: {
            x: "number",
            y: "number",
            width: "number",
            height: "number",
          },
        },
      },
    },
  },
} as const;

export const fileTableExtractionColumns = {
  columns: {
    text_content: `TEXT[]`,
    docling_metadata: `JSONB`,
    text_extraction_job_id: `UUID`,
  },
} as const;
