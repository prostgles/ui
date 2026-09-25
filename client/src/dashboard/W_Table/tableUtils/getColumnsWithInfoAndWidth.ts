import type { AnyObject } from "prostgles-types";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import type { WindowData } from "../../Dashboard/dashboardUtils";
import type { ColumnConfigWithInfo } from "../W_Table";
import { getColumnsWithInfo } from "./getColumnsWithInfo";
import { getColWidth } from "./getColWidth";

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
      ).map((c) => ({
        ...c,
        width: c.info?.udt_name === "uuid" ? 150 : c.width,
      }));

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
