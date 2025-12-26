import { getFinalFilter, type DetailedFilter } from "@common/filterUtils";
import type { BaseFilterProps } from "../SmartFilter/SmartFilter";
import { getTableSelect } from "../W_Table/tableUtils/getTableSelect";

export const validateFilter = async (
  filter: DetailedFilter,
  {
    db,
    tableName,
    column,
    tables,
  }: Pick<BaseFilterProps, "db" | "tableName" | "column" | "tables">,
) => {
  try {
    const tableHandler = db[tableName];
    const finalFilter = getFinalFilter(filter);
    const isHaving =
      column.type === "computed" && column.computedConfig.funcDef.isAggregate;
    const select =
      column.type === "column" ?
        ""
      : (
          await getTableSelect(
            { table_name: tableName, columns: column.columns },
            tables,
            db,
            finalFilter ?? {},
          )
        ).select;
    await tableHandler?.find?.(isHaving ? {} : finalFilter, {
      select,
      having: isHaving ? finalFilter : undefined,
      limit: 0,
    });
    return {
      hasError: false,
      error: undefined,
    };
  } catch (error: unknown) {
    return {
      hasError: true,
      error,
    };
  }
};
