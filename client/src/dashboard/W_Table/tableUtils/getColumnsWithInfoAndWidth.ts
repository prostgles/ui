import type { AnyObject } from "prostgles-types";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import type { WindowData } from "@common/ColumnConfig/WindowData";
import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import { getColumnsWithInfo } from "./getColumnsWithInfo";
import { getColWidth } from "./getColWidth";
import { getColumnActions } from "../ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";
import { hasCardFieldLists } from "@common/ColumnConfig/cardLayout";
import { getTableCardColumns } from "../../SmartCard/getTableCardColumns";

export const getColumnsWithInfoAndWidth = (
  tables: DBSchemaTableWithRenderInfo[],
  w: Pick<WindowData<"table">, "columns" | "table_name"> &
    Partial<Pick<WindowData<"table">, "options">>,
  data?: AnyObject[],
  windowWidth?: number,
): ColumnConfigWithInfo[] => {
  try {
    const { table_name } = w;

    const table = tables.find((table) => table.name === table_name);
    const useCardFields =
      w.options?.viewAs?.type === "card" && hasCardFieldLists(table?.card);
    let columnsWithInfo = getColumnsWithInfo(table_name, tables, w.columns, {
      showAllColumns: useCardFields,
    });
    if (useCardFields && table) {
      const { headerColumns, bodyColumns } = getTableCardColumns(
        table,
        columnsWithInfo,
      );
      const summaryColumns = new Set([
        ...headerColumns,
        ...bodyColumns.map(({ column }) => column),
      ]);
      columnsWithInfo = columnsWithInfo.map((column) => ({
        ...column,
        show: summaryColumns.has(column),
      }));
    }

    try {
      const columnsWithWidth = getColWidth(
        columnsWithInfo,
        data,
        "name",
        windowWidth,
      ).map((column, index) => {
        const actions = getColumnActions(column);
        return {
          ...column,
          width:
            columnsWithInfo[index]?.width ??
            (actions?.length ? actions.length * 200 : column.width),
        };
      });

      return columnsWithWidth;
    } catch (e) {
      console.error(e);
    }

    return columnsWithInfo.slice(0);
  } catch (e) {
    console.error(e);
    throw e;
  }
};
