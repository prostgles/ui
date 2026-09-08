import type { DBSSchema } from "./publishUtils";
import type { RequiredKeepUndefined } from "./utils";

export type ClientTableAuditConfig =
  | { error: string }
  | {
      tableName: string;
      idColumns: readonly string[];
      entityType: string;
    };

export type TableOptions = RequiredKeepUndefined<
  NonNullable<
    NonNullable<DBSSchema["connections"]["table_options"]>[string]
  > & {
    label: string;
    managedTableType?: "files" | "file-annotations";
  }
> & { audit?: ClientTableAuditConfig };
export type ColumnOptions = RequiredKeepUndefined<
  NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<DBSSchema["connections"]["table_options"]>[string]
      >["columns"]
    >[string]
  >
>;

export const annotationsTableColumns = {
  id: `INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY`,
  file_id: `UUID NOT NULL`,
  name: `TEXT`,
  text: `TEXT NOT NULL`,
  page: "INTEGER NOT NULL CHECK (page >= 1)",
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
