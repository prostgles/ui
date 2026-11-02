import type { AnyObject } from "prostgles-types";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import type { WindowData } from "@common/ColumnConfig/WindowData";
import type { ColumnConfigWithInfo } from "@common/ColumnConfig/ColumnConfig";
import { getColumnsWithInfo } from "./getColumnsWithInfo";
import { getColWidth } from "./getColWidth";
import { getColumnActions } from "../ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";

export const getColumnsWithInfoAndWidth = (
  tables: DBSchemaTableWithRenderInfo[],
  w: Pick<WindowData<"table">, "columns" | "table_name">,
  data?: AnyObject[],
  windowWidth?: number,
): ColumnConfigWithInfo[] => {
  try {
    const { table_name } = w;

    const columnsWithInfo = getColumnsWithInfo(table_name, tables, w.columns);

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
