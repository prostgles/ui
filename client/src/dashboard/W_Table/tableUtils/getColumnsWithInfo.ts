import { omitKeys, pickKeys, type ValidatedColumnInfo } from "prostgles-types";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import type { ColumnConfig } from "@common/ColumnConfig/ColumnConfig";
import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import { resolveTableColumns } from "./resolveTableColumns";

export const getColumnsWithInfo = (
  tableName: string,
  tables: DBSchemaTableWithRenderInfo[],
  cols: ColumnConfig[] | null | undefined,
  {
    allowNestedColumns = true,
    showAllColumns = false,
  }: { allowNestedColumns?: boolean; showAllColumns?: boolean } = {},
): ColumnConfigWithInfo[] => {
  const table = tables.find((t) => t.name === tableName);
  if (!table) return [];
  const tableColumns = table.columns.slice(0);
  const isAdditionalComputed = (
    computedConfig: ColumnConfigWithInfo["computedConfig"],
  ) => computedConfig && !computedConfig.isColumn;

  const getColumnWithInfo = (
    c: ColumnConfig & Pick<ColumnConfigWithInfo, "defaultConfig">,
  ): ColumnConfigWithInfo => {
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

    const columnDataType: Pick<ValidatedColumnInfo, "tsDataType" | "udt_name"> =
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
      style: c.style ?? tableColumn?.style,
      nested:
        nested &&
        ({
          ...nested,
          columns: getColumnsWithInfo(
            nested.path.at(-1)!.table,
            tables,
            nested.columns,
            { allowNestedColumns: false },
          ),
        } as ColumnConfigWithInfo["nested"]),
      info: tableColumn && omitKeys(tableColumn, ["renderAs", "style"]),
      defaultConfig: c.defaultConfig && getColumnWithInfo(c.defaultConfig),
    };
  };
  const columns = resolveTableColumns(
    table,
    tables,
    cols,
    allowNestedColumns,
    showAllColumns,
  )
    .map(getColumnWithInfo)
    .filter((c) => {
      /** Remove dropped columns */
      if (
        c.nested &&
        !tables.some((table) => table.name === c.nested?.path.at(-1)?.table)
      ) {
        return false;
      }
      if (
        c.computedConfig?.column &&
        !tableColumns.some(({ name }) => name === c.computedConfig?.column)
      ) {
        return false;
      }
      if (
        !c.computedConfig &&
        !c.info &&
        !c.nested &&
        c.format?.type !== "Action" &&
        c.format?.type !== "ActionColumns"
      ) {
        return false;
      }
      return true;
    });

  return structuredClone(columns).filter((c) => !c.info || c.info.select);
};

export const NESTED_DATA_TYPE: Pick<
  ValidatedColumnInfo,
  "tsDataType" | "udt_name"
> = {
  tsDataType: "any[]",
  udt_name: "jsonb",
};
