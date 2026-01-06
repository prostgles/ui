import type { FileTable } from "@common/utils";
import type { AnyObject } from "prostgles-types";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type { WindowData } from "../../Dashboard/dashboardUtils";
import type { ColumnConfigWInfo } from "../W_Table";
import { getColWInfo } from "./getColWInfo";
import { getColWidth } from "./getColWidth";

export const getFullColumnConfig = (
  tables: CommonWindowProps["tables"],
  w: Pick<WindowData<"table">, "columns" | "table_name">,
  data?: AnyObject[],
  windowWidth?: number,
): ColumnConfigWInfo[] => {
  try {
    const { table_name } = w;
    const table = tables.find((t) => t.name === table_name);

    if (!table) return [];
    let colsWInfo = getColWInfo(table, w.columns);

    /* Show file columns as Media format by default */
    colsWInfo = colsWInfo.map((r) => {
      const isFileColumn =
        (table.info.isFileTable && r.name === "url") || r.info?.file;
      return {
        ...r,
        format:
          !r.format && isFileColumn ?
            { type: "Media", params: { type: "From URL Extension" } }
          : r.format,
      };
    });

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

    /* If media table then set url column display format to Media  */
    if (!w.columns?.length && table.info.isFileTable) {
      colsWInfo = structuredClone(colsWInfo);
      const urlColumnIndex = colsWInfo.findIndex((c) => c.name === "url");
      const urlColumn = colsWInfo.splice(urlColumnIndex, 1)[0];
      const origNameColIdx = colsWInfo.findIndex(
        ({ name }) => name === ("original_name" satisfies keyof FileTable),
      );
      const origNameCol = colsWInfo.splice(origNameColIdx, 1)[0];
      if (origNameCol) {
        colsWInfo.unshift(origNameCol);
      }
      if (urlColumn) {
        urlColumn.format = {
          type: "Media",
          params: { type: "From URL Extension" },
        };
        colsWInfo.unshift(urlColumn);
      }
    }

    return colsWInfo.slice(0);
  } catch (e) {
    console.error(e);
    throw e;
  }
};
