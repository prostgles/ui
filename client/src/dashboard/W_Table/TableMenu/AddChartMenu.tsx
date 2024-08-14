import { mdiChartLine, mdiMap, } from "@mdi/js";
import type { ParsedJoinPath } from "prostgles-types";
import React, { useState } from "react";
import Btn from "../../../components/Btn";
import Select from "../../../components/Select/Select";
import type { DBSchemaTablesWJoins, OnAddChart, WindowData } from "../../Dashboard/dashboardUtils";
import { PALETTE } from "../../Dashboard/dashboardUtils";
import type { ChartColumn} from "./getChartCols";
import { getChartColsV2 } from "./getChartCols";
import { getRankingFunc } from "../ColumnMenu/JoinPathSelectorV2";

type P = {
  w: WindowData<"table"> | WindowData<"sql">;
  onAddChart: OnAddChart;
  tables: DBSchemaTablesWJoins; 
  btnClassName: string;
}

export const AddChartMenu = (props: P) => {

  const {
    w,
    onAddChart,
    tables, 
  } = props;

  if(!onAddChart) return null;

  const { geoCols, dateCols, sql } = getChartColsV2(w, tables);

  const tableName = w.table_name;
  const onAdd = (
    linkOpts: { type: "map" | "timechart"; columns: string[]; },
    joinPath: ParsedJoinPath[] | undefined,
  ) => {
    const columnList = `(${linkOpts.columns.join()})`;
    onAddChart({
      name: joinPath? `${[ tableName, ...joinPath.slice(0).map(p => p.table)].join(" > ")} ${columnList}` : `${tableName || ""} ${columnList}`,
      linkOpts: {
        ...linkOpts,
        joinPath,
        columns: linkOpts.columns
          .map((name, i) => ({ 
            name, 
            colorArr: PALETTE[`c${Math.min(Math.max(1, i), 5)}`].get(1, "deck")
          })
        ),
        sql,
        fromSelected: Boolean(w.selected_sql),
      }
    });
  };

  const charts: {
    cols: ChartColumn[],
    onAdd: (cols: string[], path: ParsedJoinPath[] | undefined) => any,
    label: "Map" | "Timechart";
    iconPath: string;
  }[] = [
    { label: "Map", iconPath: mdiMap, cols: geoCols, onAdd: (cols, path) => { onAdd({ type: "map", columns: cols, }, path)  } },
    { label: "Timechart", iconPath: mdiChartLine , cols: dateCols, onAdd: (cols, path) => { onAdd({ type: "timechart", columns: cols }, path)  } }
  ];

  return <>
    {charts.map(c => {
      const [firstCol] = c.cols;
      if(!firstCol) return null;
      const title = `Add ${c.label}`;
      
      /** Add all columns for render */
      if(c.label !== "Map" && c.cols.length > 1 || c.cols.some(_c => _c.type === "joined")){
        return <Select 
          key={c.label}
          title={title}
          data-command={`AddChartMenu.${c.label}`}
          btnProps={{
            children: "",
            variant: "default",
            iconPath: c.iconPath,
            size: "small",
            className: props.btnClassName
          }}
          fullOptions={c.cols.map((c, i) => ({
            key: c.type === "joined"? c.label : c.name,
            label: c.type === "joined"? `> ${c.label} (${c.name})` : c.name,
            ranking: searchTerm => getRankingFunc(searchTerm, c.type === "joined"? c.path.map(p => p.table) : [c.name]),
          }))}
          onChange={colNameOrLabel => {
            const col = c.cols.find(col => col.type === "joined"? col.label === colNameOrLabel : col.name === colNameOrLabel);
            c.onAdd([col!.name], col?.type === "joined"? col.path : undefined);
          }}
        />;
      }

      return <Btn 
        key={c.label}
        title={title}
        iconPath={c.iconPath} 
        size="small"
        className={props.btnClassName}
        data-command={`AddChartMenu.${c.label}`}
        onClick={() => { 
          c.onAdd(c.cols.map(c => c.name), undefined) 
        }} 
      />;

    })}
  </>  
}
