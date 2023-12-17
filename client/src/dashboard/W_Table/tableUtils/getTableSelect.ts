import { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { AnyObject, isDefined } from "prostgles-types";
import { isEmpty } from "../../../utils";
import { CommonWindowProps } from "../../Dashboard/Dashboard";
import { WindowData } from "../../Dashboard/dashboardUtils";
import { getSmartGroupFilter } from "../../SmartFilter/SmartFilter";
import { getTimeChartSelectParams } from "../../W_TimeChart/getTimeChartData";
import { getDesiredTimeChartBinSize, getTimeChartMinMax } from "../../W_TimeChart/getTimeChartLayersWithBins";
import { ColumnConfig } from "../ColumnMenu/ColumnMenu";
import { MinMax, MinMaxVals } from "../W_Table";
import { getFullColumnConfig } from "./tableUtils";


export const getTableSelect = async (
  w: Pick<WindowData<"table">, "columns" | "table_name">,
  tables: CommonWindowProps["tables"], 
  db: DBHandlerClient,
  filter: AnyObject,
  withoutData = false
): Promise<{ barchartVals?: AnyObject; select: AnyObject }>  => {
 
  let select: AnyObject = {};
  let barchartVals: MinMaxVals | undefined
  if (w.columns && Array.isArray(w.columns)) {

    await Promise.all(getFullColumnConfig(tables, w).map(async c => { 
      if (c.show) {

        if (c.style && ["Barchart", "Scale"].includes(c.style.type)) {
          if(c.computedConfig) throw "Cannot use Scale/Barchart styling on a computed column";
          
          barchartVals ??= {};
          const mm = withoutData? { min: -1, max: -1 } : await db[w.table_name]?.findOne?.(filter, {
            select: {
              min: { $min: [c.name] },
              max: { $max: [c.name] },
            }
          });

          const isDate = c.info?.udt_name.startsWith("timestamp") || c.info?.udt_name === "date";

          if (mm) {
            barchartVals[c.name] = {
              min: isDate ? +(new Date(mm.min)) : +mm.min,
              max: isDate ? +(new Date(mm.max)) : +mm.max,
            };
          }
        }
        
        if (c.computedConfig) {
          let funcName = c.computedConfig.funcDef.key;
          let _args: any[] = [c.computedConfig.column].filter(isDefined);
          if(c.computedConfig.column || c.computedConfig.args){
            const { args } = c.computedConfig;
            if(args?.$duration?.otherColumn){
              _args = [c.computedConfig.column, args.$duration.otherColumn];
              funcName = "$age";
            } else if(args?.$string_agg?.separator){
              _args = [c.computedConfig.column, args.$string_agg.separator]
            } else if(args?.$template_string){
              _args = [args.$template_string]
            }
          }
          select[c.name] = { [funcName]: _args }
          
        } else if(c.nested) {
          const nestedSel = await getNestedColumnSelect(c, db, tables, withoutData);
          if(nestedSel){
            if(nestedSel.dateExtent){
              barchartVals ??= {};
              barchartVals[c.name] = nestedSel.dateExtent as any;
            }
            select[c.name] = nestedSel.select;
          }
        } else {
          select[c.name] = 1;
        }
      }
    }));
    
  } else {
    select = { "*": 1 };
  }

  return { barchartVals, select }
}

export const getNestedColumnSelect = async (
  c: ColumnConfig, 
  db: DBHandlerClient, 
  tables: CommonWindowProps["tables"],
  withoutData = false
): Promise<{ select: AnyObject; dateExtent?: MinMax<Date>; } | undefined> => {
  if(!c.nested) throw "Impossible";

  let nestedSelect: AnyObject = {};
  let dateExtent: MinMax<Date> | undefined;
  if(c.nested.chart){
    const targetTable = c.nested.path.at(-1)!.table;
    dateExtent = withoutData? { min: new Date(), max: new Date() } :  await getTimeChartMinMax(db[targetTable]!, {}, c.nested.chart.dateCol)

    const { bin } = withoutData? { bin: "day" as const } : await getDesiredTimeChartBinSize({
      dataExtent: {
        minDate: dateExtent.min,
        maxDate: dateExtent.max,
      }, 
      manualBinSize: undefined, 
      pxPerPoint: 5, 
      viewPortExtent: undefined, 
      width: c.width ?? 100 
    })
    nestedSelect = getTimeChartSelectParams({ 
      bin, 
      dateColumn: c.nested.chart.dateCol, 
      groupByColumn: undefined, 
      statType: !c.nested.chart.yAxis.isCountAll? {
        funcName: c.nested.chart.yAxis.funcName,
        numericColumn: c.nested.chart.yAxis.colName,
      } : undefined,
    }).select
  } else {
    nestedSelect = (await getTableSelect({ columns: c.nested.columns, table_name: c.nested.path.at(-1)!.table }, tables, db, {}, withoutData)).select;
    if(isEmpty(nestedSelect)){
      return undefined;
    }
  }
    
  return {
    dateExtent,
    select: {
      [c.nested.joinType === "inner"? "$innerJoin" : "$leftJoin"]: c.nested.path,
      limit: c.nested.limit,
      select: nestedSelect,
      orderBy: c.nested.sort && [c.nested.sort],
      filter: getSmartGroupFilter(c.nested.detailedFilter, undefined, "and")
    }
  };
}