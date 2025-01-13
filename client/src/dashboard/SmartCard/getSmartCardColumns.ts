import type { AnyObject, ValidatedColumnInfo } from "prostgles-types";
import type { SmartCardListProps } from "./SmartCardList";

type Args = Pick<
  SmartCardListProps<AnyObject>,
  "tableName" | "tables" | "db" | "columns"
>;
export const getSmartCardColumns = async ({
  tableName,
  db,
  columns,
}: Args): Promise<ValidatedColumnInfo[] | undefined> => {
  if (columns) return columns;
  if (typeof tableName === "string") {
    const tableHandler = db[tableName];
    return tableHandler?.getColumns?.();
  }

  const sqlRes = await db.sql?.(tableName.sqlQuery, tableName.args ?? {});
  return sqlRes?.fields.map((f, i) => ({
    ...f,
    label: f.columnName ?? f.name,
    is_generated: false,
    comment: "",
    ordinal_position: i + 1,
    is_nullable: false,
    is_updatable: false,
    data_type: f.dataType,
    element_type: "",
    element_udt_name: "",
    is_pkey: false,
    has_default: false,
    select: false,
    orderBy: true,
    filter: true,
    insert: false,
    update: false,
    delete: false,
  }));
};
