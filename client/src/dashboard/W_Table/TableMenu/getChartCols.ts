import type { ParsedJoinPath, ValidatedColumnInfo } from "prostgles-types";
import { isDefined } from "../../../utils";
import type { DBSchemaTablesWJoins, WindowData, WindowSyncItem } from "../../Dashboard/dashboardUtils";
import { getAllJoins } from "../ColumnMenu/JoinPathSelectorV2";
import { getColWInfo } from "../tableUtils/getColWInfo";
 
export type ColInfo = Pick<ValidatedColumnInfo, "name" | "udt_name">;
type JoinedChartColumn = {
  type: "joined";
  label: string;
  path: ParsedJoinPath[];
  numericCols: ColInfo[];
} & ColInfo;
export type ChartColumn = (JoinedChartColumn | {
  type: "normal";
  numericCols: ColInfo[];
}) & ColInfo;
export const isGeoCol = (c: ColInfo) => ["geography", "geometry"].includes(c.udt_name);
export const isDateCol = (c: ColInfo) => c.udt_name.startsWith("timestamp") || c.udt_name === "date";

export const getChartCols = (
  w: WindowData<"table"> | WindowSyncItem<"table">,
  tables: DBSchemaTablesWJoins
): {
  geoCols: ChartColumn[];
  dateCols: ChartColumn[];
  // otherCols: ChartColumn[];
  sql?: undefined;
} => {

  const getNumericCols = (cols: ValidatedColumnInfo[]): ColInfo[] => cols
    .sort((b, a) => {
      /** Sort primary keys down */
      return Number(b.is_pkey || false) - Number(a.is_pkey || false) || (b.references?.length ?? 0) - (a.references?.length ?? 0);
    });

  const allJoins = getAllJoins({ tableName: w.table_name!, tables, value: undefined });
  const dateColsJoined = allJoins.allJoins.flatMap(j => j.table.columns.filter(isDateCol).map(c => ({
    type: "joined",
    ...j,
    label: j.label,
    name: c.name,
    udt_name: c.udt_name,
    numericCols: getNumericCols(j.table.columns),
  } satisfies ChartColumn))).filter(isDefined);
  const geoColsJoined = allJoins.allJoins.flatMap(j => j.table.columns.filter(isGeoCol).map(c => ({
    type: "joined",
    ...j,
    name: c.name,
    label: j.label,
    udt_name: c.udt_name,
    numericCols: getNumericCols(j.table.columns),
  } satisfies ChartColumn))).filter(isDefined);


  const cols = getColWInfo(tables, w).map(c => ({ ...c, udt_name: c.info?.udt_name || c.computedConfig?.funcDef.outType.udt_name || "text" }));

  //@ts-ignore
  const windowDateCols: ChartColumn[] = cols.filter(isDateCol).map(c => ({ 
    ...c,
    type: "normal",
    numericCols: getNumericCols(tables.find(t => t.name === w.table_name)?.columns || []), 
  }))
  const windowGeoCols: ChartColumn[] = cols.filter(isGeoCol).map(c => ({ 
    ...c, 
    type: "normal",
    numericCols: getNumericCols(tables.find(t => t.name === w.table_name)?.columns || []), 
  }))
  
  const dateCols: ChartColumn[] = [
    ...windowDateCols,
    ...dateColsJoined,
  ];
  const geoCols: ChartColumn[] = [
    ...windowGeoCols,
    ...geoColsJoined,
  ];

  // const otherCols = cols.filter(c => 
  //   !dateCols.some(gc => gc.name === c.name) && !geoCols.some(gc => gc.name === c.name)
  // ).map(c => ({ ...c, type: "normal" as const }))
  // .sort((b, a) => {
  //   /** Sort primary keys down */
  //   return Number(b.info?.is_pkey || false) - Number(a.info?.is_pkey || false) || (b.info?.references?.length ?? 0) - (a.info?.references?.length ?? 0);
  // })
  
  return {
    dateCols,
    geoCols,
  }
}