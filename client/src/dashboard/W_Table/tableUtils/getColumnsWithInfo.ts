import { omitKeys, pickKeys, type ValidatedColumnInfo } from "prostgles-types";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import type { ColumnConfig } from "../ColumnMenu/ColumnMenu";
import type { ColumnConfigWithInfo } from "../W_Table";

export const getColumnsWithInfo = (
  tableName: string,
  tables: DBSchemaTableWithRenderInfo[],
  cols: ColumnConfig[] | null | undefined,
): ColumnConfigWithInfo[] => {
  const table = tables.find((t) => t.name === tableName);
  if (!table) return [];
  const tableColumns = table.columns.slice(0);
  const isAdditionalComputed = (
    computedConfig: ColumnConfigWithInfo["computedConfig"],
  ) => computedConfig && !computedConfig.isColumn;

  const columns: ColumnConfigWithInfo[] = (cols ?? [])
    .map((c) => {
      const { computedConfig, nested } = c;
      const tableColumnName =
        nested || isAdditionalComputed(c.computedConfig) ? undefined : (
          (computedConfig?.column ?? c.name)
        );

      const tableColumn =
        tableColumnName ?
          tableColumns.find(
            ({ select, name }) => select && name === tableColumnName,
          )
        : undefined;

      const columnDataType: Pick<
        ValidatedColumnInfo,
        "tsDataType" | "udt_name"
      > =
        nested ? NESTED_DATA_TYPE : (
          pickKeys(
            c.computedConfig ??
              tableColumn ?? { tsDataType: "any", udt_name: "jsonb" },
            ["tsDataType", "udt_name"],
          )
        );

      return {
        ...c,
        ...columnDataType,
        format: c.format ?? tableColumn?.renderAs,
        nested:
          nested &&
          ({
            ...nested,
            columns: getColumnsWithInfo(
              nested.path.at(-1)!.table,
              tables,
              nested.columns,
            ),
          } as ColumnConfigWithInfo["nested"]),
        info: tableColumn && omitKeys(tableColumn, ["renderAs", "style"]),
      };
    })
    .filter((c) => {
      /** Remove dropped columns */
      if (!c.computedConfig && !c.info && !c.nested) {
        return false;
      }
      return true;
    });

  const newCols = tableColumns.filter(
    (c) => !columns.find((r) => r.info && r.name === c.name),
  );

  return structuredClone([
    ...columns,
    ...newCols.map(
      (c) =>
        ({
          info: c,
          format: c.renderAs,
          ...pickKeys(c, ["tsDataType", "udt_name"]),
          name: c.name,
          show: true,
        }) satisfies ColumnConfigWithInfo,
    ),
  ]).filter((c) => !c.info || c.info.select);
};

export const NESTED_DATA_TYPE: Pick<
  ValidatedColumnInfo,
  "tsDataType" | "udt_name"
> = {
  tsDataType: "any[]",
  udt_name: "jsonb",
};
