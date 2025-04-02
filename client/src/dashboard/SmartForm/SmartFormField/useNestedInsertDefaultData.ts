import { useMemo } from "react";
import type { SmartFormProps } from "../SmartForm";
import type { AnyObject } from "prostgles-types";

export const useNestedInsertDefaultData = ({
  tables,
  tableName,
  row,
  ftable,
}: Pick<SmartFormProps, "tables" | "tableName"> & {
  row: AnyObject | undefined;
  ftable: string;
}) => {
  const defaultData = useMemo(() => {
    const table = tables.find((t) => t.name === tableName);
    const joinConfig = table?.joinsV2.find((j) => j.tableName === ftable);
    if (!joinConfig || !row) return;
    const data = {};
    joinConfig.on.map((fkey) => {
      fkey.map(([pcol, fcol]) => {
        data[fcol] = row[pcol];
      });
    });
    return data;
  }, [row, ftable, tables, tableName]);

  return defaultData;
};
