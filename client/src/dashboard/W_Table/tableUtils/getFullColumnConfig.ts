import type { AnyObject } from "prostgles-types";
import type { DBSchemaTableWithRenderInfo } from "src/dashboard/Dashboard/getTables";
import type { WindowData } from "../../Dashboard/dashboardUtils";
import type { ColumnConfigWInfo } from "../W_Table";
import { getColWInfo } from "./getColWInfo";
import { getColWidth } from "./getColWidth";

export const getFullColumnConfig = (
  tables: DBSchemaTableWithRenderInfo[],
  w: Pick<WindowData<"table">, "columns" | "table_name">,
  data?: AnyObject[],
  windowWidth?: number,
): ColumnConfigWInfo[] => {
  try {
    const { table_name } = w;
    const table = tables.find((t) => t.name === table_name);

    if (!table) return [];
    let colsWInfo = getColWInfo(table, w.columns);

    try {
      colsWInfo = getColWidth(
        colsWInfo.map((r) => ({
          ...r,
          ...(r.info ?? { udt_name: "text", tsDataType: "string" }),
        })),
        data,
        "name",
        windowWidth,
      ).map((c) => ({
        ...c,
        width: c.info?.udt_name === "uuid" ? 150 : c.width,
      }));
    } catch (e) {
      console.error(e);
    }

    return colsWInfo.slice(0);
  } catch (e) {
    console.error(e);
    throw e;
  }
};
