import { isDefined } from "../../../utils";
import type { DBSchemaTablesWJoins, WindowData, WindowSyncItem } from "../../Dashboard/dashboardUtils";
import { getAllJoins } from "../ColumnMenu/JoinPathSelectorV2";
import { getColWInfo } from "../tableUtils/getColWInfo"; 
import type { ParsedJoinPath, ValidatedColumnInfo } from "prostgles-types";
 
export type ColInfo = Pick<ValidatedColumnInfo, "name" | "udt_name">;
type JoinedChartColumn = {
  type: "joined";
  label: string;
  path: ParsedJoinPath[];
} & ColInfo;
export type ChartColumn = (JoinedChartColumn | {
  type: "normal";
}) & ColInfo;
const isGeoCol = (c: ColInfo) => ["geography", "geometry"].includes(c.udt_name);
const isDateCol = (c: ColInfo) => c.udt_name.startsWith("timestamp") || c.udt_name === "date";

export const getChartColsV2 = (
  w: WindowData<"sql"> | WindowData<"table"> | WindowSyncItem<"sql"> | WindowSyncItem<"table">,
  tables: DBSchemaTablesWJoins
): {
  geoCols: ChartColumn[];
  dateCols: ChartColumn[];
  cols: ChartColumn[];
  sql: string | undefined;
} => {
  const allJoins = getAllJoins({ tableName: w.table_name!, tables, value: undefined });
  const dateColsJoined = allJoins.allJoins.flatMap(j => j.table.columns.filter(isDateCol).map(c => ({
    type: "joined",
    ...j,
    label: j.label,
    name: c.name,
    udt_name: c.udt_name,
  } satisfies ChartColumn))).filter(isDefined);
  const geoColsJoined = allJoins.allJoins.flatMap(j => j.table.columns.filter(isGeoCol).map(c => ({
    type: "joined",
    ...j,
    name: c.name,
    label: j.label,
    udt_name: c.udt_name,
  } satisfies ChartColumn))).filter(isDefined);


  let windowDateCols: ChartColumn[] = [];
  let windowGeoCols: ChartColumn[] = [];
  if(w.type === "table"){
    const table = tables.find(t => t.name === w.table_name);
    if(table){
      const cols = getColWInfo( tables, w).map(c => ({ ...c, udt_name: c.info?.udt_name || c.computedConfig?.funcDef.outType.udt_name || "text" }));
      //@ts-ignore
      windowDateCols = cols.filter(isDateCol).map(c => ({ ...c, type: "normal" }))
      windowGeoCols = cols.filter(isGeoCol).map(c => ({ ...c, type: "normal" }))
    }
  } else {
    const cols = w.options?.sqlResultCols?.map(c => ({ ...c, name: c.key })) || [];
    windowDateCols = cols.filter(isDateCol).map(c => ({ ...c, type: "normal" }))
    windowGeoCols = cols.filter(isGeoCol).map(c => ({ ...c, type: "normal" }));
  }
  
  const dateCols: ChartColumn[] = [
    ...windowDateCols,
    ...dateColsJoined,
  ];
  const geoCols: ChartColumn[] = [
    ...windowGeoCols,
    ...geoColsJoined,
  ];
  return {
    sql: w.type === "sql"? w.options?.lastSQL : "",
    dateCols,
    geoCols,
    cols: [...dateCols, ...geoCols],
  }
}