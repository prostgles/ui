import { mdiPlus } from "@mdi/js";
import { isDefined } from "prostgles-types";
import React, { useMemo } from "react";
import Select from "../../components/Select/Select";
import { MapLayerManagerProps } from "./ChartLayerManager";

export const AddChartLayer = ({ tables, type, prgl: {dbs}, w }: MapLayerManagerProps) => {
  const isMap = type === "map";

  const chartTables = useMemo(() => {
    return tables.flatMap(t => {
      const chartCols = t.columns.filter(c => c.udt_name.startsWith(isMap? "geo" : "timestamp"));
      if(chartCols.length){
        return chartCols.map(c => ({
          key: `${t.name}.${c.name}`,
          tableName: t.name,
          column: c.name,
        }))
      }
      return undefined;
    }).filter(isDefined).sort((a, b) => a.key.localeCompare(b.key))
  }, [tables]);

  return <Select 
    className="mt-2"
    btnProps={{
      iconPath: mdiPlus,
      color: "action",
      children: "Add layer"
    }}
    fullOptions={chartTables
      .map(t => ({
        key: t.key,
        label: t.tableName,
        subLabel: t.column,
      }))
    }
    onChange={key => {
      const chartTableFromKey = chartTables.find(gt => gt.key === key);
      if(chartTableFromKey){
        const  colorArr = [100, 20, 57];

        dbs.links.insert({
          w1_id: w.id,
          w2_id: w.id,
          workspace_id: w.workspace_id,
          options: {
            type,
            colorArr,
            columns: [{ 
              name: chartTableFromKey.column, 
              colorArr 
            }],
            localTableName: chartTableFromKey.tableName,
          },
          last_updated: undefined as any, 
          user_id: undefined as any,
        })
      }
    }}
  />
}
