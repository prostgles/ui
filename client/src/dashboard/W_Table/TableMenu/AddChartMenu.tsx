import { mdiChartLine, mdiMap, } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/prostgles";
import { _PG_numbers, isDefined, type ParsedJoinPath, type SQLHandler } from "prostgles-types";
import React from "react";
import Btn, { type BtnProps } from "../../../components/Btn";
import Select from "../../../components/Select/Select";
import type { DBSchemaTablesWJoins, OnAddChart, WindowData } from "../../Dashboard/dashboardUtils";
import { PALETTE } from "../../Dashboard/dashboardUtils";
import { getTableExpressionReturnType } from "../../SQLEditor/SQLCompletion/completionUtils/getQueryReturnType";
import { getRankingFunc } from "../ColumnMenu/JoinPathSelectorV2";
import type { ChartColumn } from "./getChartCols";
import { getChartCols, isDateCol, isGeoCol } from "./getChartCols";

type P = {
  w: WindowData<"table"> | WindowData<"sql">;
  sql: string;
  sqlHandler: SQLHandler;
  onAddChart: OnAddChart;
  tables: DBSchemaTablesWJoins; 
  btnClassName?: string;
  size?: "micro";
};

export const AddChartMenu = (props: P) => {

  const {
    w,
    onAddChart,
    tables, 
    sql: propsSql,
    sqlHandler,
    size,
  } = props;

  const isMicroMode = size === "micro";

  const chartCols = usePromise(async () => {
    const res = !propsSql? getChartCols(w, tables) : await getChartColsFromSql(propsSql, sqlHandler)
    return res
  }, [propsSql, sqlHandler, tables, w]);
  if(!chartCols) return null;
  const { geoCols, dateCols, sql, cols: allCols } = chartCols;

  
  const tableName = w.table_name;
  const onAdd = (
    linkOpts: { type: "map" | "timechart"; columns: string[]; timechartNumericColumn?: string; },
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
      }
    });
  };

  const charts: {
    cols: ChartColumn[],
    onAdd: (cols: string[], path: ParsedJoinPath[] | undefined) => any,
    label: "Map" | "Timechart";
    iconPath: string;
  }[] = [
    { 
      label: "Map", 
      iconPath: mdiMap, 
      cols: geoCols, 
      onAdd: (cols, path) => { 
        onAdd({ type: "map", columns: cols, }, path)  
      } 
    },
    { 
      label: "Timechart", 
      iconPath: mdiChartLine , 
      cols: dateCols, 
      onAdd: (cols, path) => { 
        onAdd({ 
          type: "timechart", 
          columns: cols, 
          // timechartNumericColumn: allCols.find(c => _PG_numbers.includes(c.udt_name as any)  )?.name 
        }, path)  
      } 
    }
  ];

  return <>
    {charts.map(c => {
      const [firstCol] = c.cols;
      const isMap = c.label === "Map";
      const title = `Add ${c.label}`;
      const btnProps: BtnProps = {
        title,
        size: size ?? "small",
        iconPath: c.iconPath,
        className: props.btnClassName,
        "data-command": `AddChartMenu.${c.label}`,
      }


      /** Add all columns for render 
       * Why the map exclusion?
      */
      if(c.label !== "Map" && c.cols.length > 1 || c.cols.some(_c => _c.type === "joined")){
        return <Select 
          key={c.label}
          title={title}
          data-command={btnProps["data-command"]}
          btnProps={{
            children: "",
            variant: "default",
            ...btnProps,
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

      if(!firstCol && isMicroMode){
        return undefined;
      }

      return <Btn 
        key={c.label}
        disabledInfo={!firstCol? `No ${isMap? "geography/geometry" : "date/timestamp"} columns available` : undefined}
        {...btnProps}
        onClick={() => { 
          c.onAdd(c.cols.map(c => c.name), undefined) 
        }} 
      />;

    }).filter(isDefined)}
  </>  
}


type AddChartMenuFromSqlProps = {
  onAddChart: OnAddChart;
  sql: string;
  sqlHandler: SQLHandler;
};

export const AddChartMenuFromSql = ({ onAddChart, sql, sqlHandler }: AddChartMenuFromSqlProps) => {
  const chartCols = usePromise(async () => {
    return getChartColsFromSql(sql, sqlHandler)
  }, [sql, sqlHandler]);

  if(!chartCols) return null;

}

export const getChartColsFromSql = async (sql: string, sqlHandler: SQLHandler) => {
  const trimmedSql = sql.trim();
  const { colTypes = [] } = await getTableExpressionReturnType(trimmedSql, sqlHandler);
  const cols: ChartColumn[] = colTypes.map(c => ({ 
    ...c,
    type: "normal",
    name: c.column_name, 
    udt_name: c.udt_name as any, 
  }));

  return {
    sql: trimmedSql,
    cols,
    geoCols: cols.filter(c => isGeoCol(c)),
    dateCols: cols.filter(c => isDateCol(c)),
  }
}