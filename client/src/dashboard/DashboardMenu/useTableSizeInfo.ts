import { usePromise } from "prostgles-client/dist/react-hooks";
import type { DashboardMenuProps } from "./DashboardMenu";
import { kFormatter } from "../W_Table/W_Table";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { useMemo } from "react";

type Args = Pick<DashboardMenuProps, "workspace" | "tables"> & { 
  db: DBHandlerClient; 
};
export const useTableSizeInfo = ({ workspace, tables, db }: Args) => {

  const { tableListEndInfo, tableListSortBy } = workspace.options;
  const tablesWithInfoNonSorted = usePromise(async () => {
    const query = `
      WITH table_sizes AS (
        SELECT
          table_schema,
          table_name,
          to_regclass(format('%I.%I', table_schema, table_name))::oid as table_oid,
          pg_total_relation_size(quote_ident(table_name)) as size_num,
          pg_total_relation_size(quote_ident(table_name)) as total_size_num
        FROM information_schema.tables
        WHERE to_regclass(format('%I.%I', table_schema, table_name))::oid IN (\${oids:csv})
      )
      SELECT
        *,
        pg_size_pretty(size_num) as size_str,
        pg_size_pretty(total_size_num) as total_size_str
      FROM table_sizes
    `;
    const oids = tables.map(t => t.info.oid)
    const tableSizes = ((tableListEndInfo === "size" && db.sql && oids.length)? await db.sql(query, { oids }, { returnType: "rows" }).catch(e => {
      console.error("Failed to get table sizes", e);
      return [];
    }) : []) as {
      table_oid: number;
      size_num: string;
      size_str: string;
      table_schema: string;
      table_name: string;
      total_size_num: string;
      total_size_str: string;
    }[];

    return tables
      .map(t => {
        const sizeInfo = tableSizes.find(ts => ts.table_oid == t.info.oid);
        const endText = tableListEndInfo === "none"? "" : 
          (tableListEndInfo === "size"? 
            (sizeInfo?.total_size_num === "0"? 
              "0" : 
              sizeInfo?.total_size_str
            ) : 
          (+t.count) > 0? kFormatter(+t.count) : ""
          ) || "";
        const endTitle = tableListEndInfo === "none"? "" : 
          tableListEndInfo === "size"? "Total table size" : 
          "Row count";

        return {
          ...t,
          endText,
          endTitle,
          sizeInfo: sizeInfo || {},
          sizeNum: +(sizeInfo?.total_size_num ?? "0"),
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tables, tableListEndInfo, db]);

  const tablesWithInfo = useMemo(() => {
    return tablesWithInfoNonSorted?.sort((a, b) => {
      if(tableListSortBy === "name") return a.name.localeCompare(b.name);
      if(tableListSortBy === "extraInfo" && tableListEndInfo === "count") return +b.count - +a.count;
      if(tableListSortBy === "extraInfo" && tableListEndInfo === "size") return b.sizeNum - a.sizeNum;
      return 0;
    });
  }, [tableListSortBy, tableListEndInfo, tablesWithInfoNonSorted])

  return { tablesWithInfo: tablesWithInfo ?? [] };
}