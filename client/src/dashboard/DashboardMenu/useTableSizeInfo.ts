import { usePromise } from "prostgles-client/dist/react-hooks";
import type { DashboardMenuProps } from "./DashboardMenu";
import { kFormatter } from "../W_Table/W_Table";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { useMemo } from "react";
import { bytesToSize } from "../Backup/BackupsControls";
import type { DBSchemaTablesWJoins } from "../Dashboard/dashboardUtils";

type Args = Pick<DashboardMenuProps, "workspace" | "tables"> & {
  db: DBHandlerClient;
};
export type TablesWithInfo = (DBSchemaTablesWJoins[number] & {
  endText: string;
  endTitle: string;
  count: number;
  sizeNum: number;
})[];
export const useTableSizeInfo = ({
  workspace,
  tables,
  db,
}: Args): { tablesWithInfo: TablesWithInfo } => {
  const { tableListEndInfo, tableListSortBy } = workspace.options;
  const tablesWithInfoNonSorted = usePromise(async () => {
    return await Promise.all(
      tables.map(async (t) => {
        let count = 0;
        let sizeNum = 0;
        const countRequestedAndAllowed =
          tableListEndInfo === "count" && db[t.name]?.count;
        const tableHasColumnsAndWillNotError = !!t.columns.length;
        const shouldGetCount =
          countRequestedAndAllowed && tableHasColumnsAndWillNotError;

        try {
          count = Number(
            (shouldGetCount ? await db[t.name]?.count?.() : 0) ?? 0,
          );
          sizeNum = Number(
            tableListEndInfo === "size" ? await db[t.name]?.size?.() : 0,
          );
        } catch (e) {}
        if (!Number.isFinite(sizeNum)) sizeNum = 0;
        if (!Number.isFinite(count)) count = 0;

        const endTitle =
          tableListEndInfo === "none" ? ""
          : tableListEndInfo === "size" ? "Table size"
          : "Row count";
        const endText =
          tableListEndInfo === "none" ? "" : (
            (tableListEndInfo === "size" ?
              sizeNum === 0 ?
                "0"
              : bytesToSize(sizeNum, 0)
            : +count > 0 ? kFormatter(+count)
            : "") || ""
          );

        return {
          ...t,
          endText,
          endTitle,
          count,
          sizeNum,
        };
      }),
    );
  }, [tables, tableListEndInfo, db]);

  const tablesWithInfo = useMemo(() => {
    if (!tablesWithInfoNonSorted) {
      const tablesWithEmptyInfo = tables.map((t) => ({
        ...t,
        endText: "",
        endTitle: "",
        count: 0,
        sizeNum: 0,
      }));
      if (tableListSortBy === "name")
        return tablesWithEmptyInfo.sort((a, b) => a.name.localeCompare(b.name));
      return tablesWithEmptyInfo;
    }
    return tablesWithInfoNonSorted.sort((a, b) => {
      if (tableListSortBy === "name") return a.name.localeCompare(b.name);
      if (tableListSortBy === "extraInfo" && tableListEndInfo === "count")
        return +b.count - +a.count;
      if (tableListSortBy === "extraInfo" && tableListEndInfo === "size")
        return b.sizeNum - a.sizeNum;
      return 0;
    });
  }, [tableListSortBy, tableListEndInfo, tablesWithInfoNonSorted, tables]);

  return {
    tablesWithInfo,
  };
};
