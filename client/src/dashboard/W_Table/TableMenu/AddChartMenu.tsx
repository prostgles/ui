import { mdiChartLine, mdiMap, } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/prostgles";
import { _PG_numbers, isDefined, type ParsedJoinPath, type SQLHandler } from "prostgles-types";
import React from "react";
import Btn, { type BtnProps } from "../../../components/Btn";
import Select from "../../../components/Select/Select";
import type { DBSchemaTablesWJoins, OnAddChart, WindowData } from "../../Dashboard/dashboardUtils";
import { getRandomColor } from "../../Dashboard/dashboardUtils";
import { getTableExpressionReturnType } from "../../SQLEditor/SQLCompletion/completionUtils/getQueryReturnType";
import { getRankingFunc } from "../ColumnMenu/JoinPathSelectorV2";
import type { ChartColumn, ColInfo } from "./getChartCols";
import { getChartCols, isDateCol, isGeoCol } from "./getChartCols";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import { rgbaToString } from "../../W_Map/getMapFeatureStyle";

type P = Pick<CommonWindowProps, "myLinks"> & {
  w: WindowData<"table"> | WindowData<"sql">;
  sql: string | undefined;
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
    myLinks,
  } = props;

  const isMicroMode = size === "micro";

  const chartCols = usePromise(async () => {
    const res = w.type === "table"? getChartCols(w, tables) : await getChartColsFromSql(propsSql ?? w.sql, sqlHandler)
    return res
  }, [propsSql, sqlHandler, tables, w]);
  if(!chartCols) return null;
  const { geoCols, dateCols, sql } = chartCols;

  const tableName = w.table_name;
  const onAdd = (
    linkOpts: { type: "map" | "timechart"; columns: string[]; },
    joinPath: ParsedJoinPath[] | undefined,
    numericCols: ColInfo[] = []
  ) => {
    const firstNumericColumn = numericCols.find(c => _PG_numbers.includes(c.udt_name as any))?.name;
    const columnList = `(${linkOpts.columns.join()})`;
    const name = joinPath? `${[ tableName, ...joinPath.slice(0).map(p => p.table)].join(" > ")} ${columnList}` : `${tableName || ""} ${columnList}`;
    const usedColors = myLinks.flatMap(l => l.options.type !== "table"? l.options.columns.map(c => c.colorArr) : undefined);
    const colorArr = getRandomColor(1, "deck", usedColors);
    const type = linkOpts.type;
    onAddChart({
      name,
      linkOpts: {
        ...(type === "timechart"? {
          type, 
          columns: [{
            name: linkOpts.columns[0]!,
            colorArr,
            statType: firstNumericColumn? { 
              funcName: "$avg", 
              numericColumn: firstNumericColumn,
            } : undefined
          }]
        } : {
          type,
          columns: linkOpts.columns.map((name, i) => ({ 
            name, 
            colorArr
          }))
        }),
        joinPath,
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
        }, path)  
      } 
    }
  ];

  return <>
    {charts.map(c => {
      const [firstCol] = c.cols;
      const isMap = c.label === "Map";
      const title = `Add ${c.label}`;
      const layerAlreadyAdded = myLinks.map(({ options: linkOpts }) => {
        if(linkOpts.type === "table") {
          return undefined;
        }

        const matches = linkOpts.type === c.label.toLowerCase() && (
          w.type === "sql" && sql === linkOpts.sql ||
          w.type === "table" && c.cols.some(col => linkOpts.columns.some(c => c.name === col.name))
        );
        if(matches) return linkOpts.columns[0]?.colorArr;
      }).find(isDefined);
      const btnProps: BtnProps = {
        title,
        size: size ?? "small",
        iconPath: c.iconPath,
        className: props.btnClassName,
        style: {
          minHeight: 0,
          color: layerAlreadyAdded? rgbaToString(layerAlreadyAdded as any) : undefined,
        },
        "data-command": `AddChartMenu.${c.label}`,
      };

      /** 
       * If map and no joined columns then add all columns for render 
       * Timechart can only render one date column
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
            disabledInfo: layerAlreadyAdded? "Layer already added" : undefined,
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
        disabledInfo={
          layerAlreadyAdded? "Layer already added" : 
          !firstCol? `No ${isMap? "geography/geometry" : "date/timestamp"} columns available` : 
          undefined
        }
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
  const _allCols: ColInfo[] = colTypes.map(c => ({ 
    ...c,
    name: c.column_name, 
    udt_name: c.udt_name as any, 
  }));
  const allCols: ChartColumn[] = _allCols.map(c => ({ 
    ...c,
    type: "normal",
    numericCols: _allCols.filter(c => !isGeoCol(c) && !isDateCol(c)),
  }));

  return {
    sql: trimmedSql, 
    geoCols: allCols.filter(c => isGeoCol(c)),
    dateCols: allCols.filter(c => isDateCol(c)),
  }
}