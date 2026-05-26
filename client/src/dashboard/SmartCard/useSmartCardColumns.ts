import { usePromise } from "prostgles-client";
import { isObject, type AnyObject } from "prostgles-types";
import type { SmartCardListProps } from "../SmartCardList/SmartCardList";

type Args = Pick<
  SmartCardListProps<AnyObject>,
  "tableName" | "tables" | "columns" | "sql"
>;
export const useSmartCardColumns = ({
  tableName,
  tables,
  columns,
  sql,
}: Args) => {
  const sqlColumns = usePromise(async () => {
    if (!isObject(tableName)) return;
    const sqlRes = await sql?.(tableName.sqlQuery, tableName.args ?? {});
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
  }, [sql, tableName]);

  return (
    columns ??
    (isObject(tableName) ? sqlColumns : (
      tables.find((t) => t.name === tableName)?.columns
    ))
  );
};
