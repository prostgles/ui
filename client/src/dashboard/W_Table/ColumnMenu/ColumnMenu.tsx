import {
  mdiEye,
  mdiEyeOff,
  mdiEyeRemove,
  mdiFilter,
  mdiFormatColorFill,
  mdiFormatText,
  mdiFunction,
  mdiLinkPlus,
  mdiSort,
  mdiTableColumnPlusAfter,
  mdiTools,
  mdiViewColumnOutline,
} from "@mdi/js";
import { DBHandlerClient, TableHandlerClient } from 'prostgles-client/dist/prostgles';
import React, { useState } from 'react';
import Tabs, { TabItems } from '../../../components/Tabs';
import { DeepPartial } from '../../RTComp';

import { TimechartRenderStyle, TIMECHART_STAT_TYPES } from "../../W_TimeChart/W_TimeChartMenu";
import { AlterColumn } from './AlterColumn/AlterColumn';
import { BarchartStyle, ConditionalStyle, FixedStyle, ScaleStyle, ColumnStyleControls } from './ColumnStyleControls';

import { ParsedJoinPath } from "prostgles-types";
import { SimpleFilter, SmartGroupFilter } from '../../../../../commonTypes/filterUtils';
import { DBS } from "../../Dashboard/DBS";
import { CommonWindowProps } from '../../Dashboard/Dashboard';
import { WindowData, WindowSyncItem } from "../../Dashboard/dashboardUtils";
import SmartFilter from '../../SmartFilter/SmartFilter';
import { getColumnsConfig } from "../TableMenu/getColumnsConfig";
import W_Table, { ColumnConfigWInfo } from '../W_Table';
import { getFullColumnConfig, updateWCols } from "../tableUtils/tableUtils";
import { AddComputedColMenu } from "./AddComputedColMenu";
import { ColumnDisplayFormat } from "./ColumnDisplayFormat/ColumnDisplayFormat";
import { ColumnFormat, getFormatOptions } from "./ColumnDisplayFormat/columnFormatUtils";
import { ColumnSortMenu } from "./ColumnSortMenu";
import ColumnsMenu from "./ColumnsMenu";
import { NESTED_COLUMN_DISPLAY_MODES, LinkedColumn } from "./LinkedColumn/LinkedColumn";
import { FuncDef, FunctionSelector } from "./FunctionSelector"; 
import { useEffectAsync } from "../../DashboardMenu/DashboardMenuSettings";
import { useIsMounted } from "../../Backup/CredentialSelector";
import { useReactiveState } from "../../ProstglesMethod/hooks";
import Popup from "../../../components/Popup/Popup";


export type ColumnConfig = {
  name: string;
  show?: boolean;
  nested?: {
    path: ParsedJoinPath[];
    columns: Omit<ColumnConfig, "nested">[];
    joinType?: "inner" | "left";
    displayMode?: typeof NESTED_COLUMN_DISPLAY_MODES[number]["key"];
    limit?: number;
    sort?: ColumnSort;
    detailedFilter?: SmartGroupFilter;
    chart?: {
      type: "time";
      dateCol: string;
      renderStyle: TimechartRenderStyle | "smooth-line";
      sortableColumns: string[];
      yAxis: { 
        isCountAll: false; 
        colName: string; 
        funcName: typeof TIMECHART_STAT_TYPES[number]["func"]; 
      } | { 
        isCountAll: true;
      };
    }
  };
  style?:
    | { type: "None" }
    | ConditionalStyle
    | FixedStyle
    | ScaleStyle
    | BarchartStyle
  format?: ColumnFormat;

  /** If present then this is a computed column */
  computedConfig?: {
    /**
     * If true then this (name === computedConfig.column) represents an actual column and should not be removed
     */
    isColumn?: boolean;
    funcDef: FuncDef;

    /**
     * In case of functions that don't need cols column will be undefined
     */
    column: string | undefined;
    args?: {
      $duration?: { otherColumn: string }
      $string_agg?: { separator: string }
      $template_string?: string;
    }

  };
  width?: number;
};


type P = Pick<CommonWindowProps, 'suggestions' | 'tables' | "prgl"> & {
  tableName: string;
  db: DBHandlerClient; 
  dbs: DBS;
  w: WindowSyncItem<"table">;
  columnMenuState: W_Table["columnMenuState"];
};

export type ColumnSort = {
  key: string | number;
  asc?: boolean | null; 
  nulls?: "first" | "last" | null;
  nullEmpty?: boolean;
}

export const ColumnMenu = (props: P) => {

  const [{ w, delta }, setW] = useState<{ w: WindowSyncItem<"table">; delta?: DeepPartial<WindowData<"table">>}>({ w: props.w, delta: undefined });
  const [column, setColumn] = useState<ColumnConfigWInfo>();
  const [activeKey, setActiveKey] = useState<string>();
  const { state, setState } = useReactiveState(props.columnMenuState);
  const colName = state?.column;
  const getIsMounted = useIsMounted(); 
  useEffectAsync(async () => {
    const wSub = await w.$cloneSync(async (w, delta)=> {
      if(!getIsMounted()) return;
      setW({ w, delta });
    });
    return wSub.$unsync;
  }, [setW]);

  useEffectAsync(async () => {
 
    if(!w.columns || !Array.isArray(w.columns)){
      updateWCols(w, await getColumnsConfig(db[tableName] as TableHandlerClient, w, true))
    } else if(colName) {
      const column = getFullColumnConfig(tables, w).find(c => c.name === colName);
      if(!column){
        console.warn(`Column (${colName}) was not found, delete?!`)
      } else {
        setColumn(column)
      }
    } 

  }, [w, delta, colName]);


  const onUpdate = (nc: Partial<ColumnConfig> ) => {
    if(!column) return;
    const newCols = w.columns?.map((c, i)=> {
      if(c.name === column.name){
        return { ...c, ...nc }
      }
      return c;
    });
    updateWCols(w, newCols);
  }

  const { db, tableName, tables, prgl: { theme } } = props;
  if(!column || !state) return null;

  const onClose = () => {
    setState(undefined);
    setActiveKey(undefined);
  }

  const table = tables.find(t => t.name === w.table_name);
  const validatedColumn = table?.columns.find(c => c.name === colName);
  
  const isComputed = !!((column.format && column.format.type !== "NONE") || column.computedConfig || column.nested);
  const computedType = column.nested? "nested" : column.computedConfig && (column.computedConfig.isColumn ? "column" : "added");
  const items = {
    "Sort": {
      leftIconPath: mdiSort,
      disabledText: (!validatedColumn?.orderBy && !column.nested)? "Not permitted" : undefined,
      style: w.sort?.some(s => !column.nested? s.key === column.name : column.nested.columns.some(nc => `${column.name}.${nc.name}`))? { color: "var(--blue-600)" } : {},
      content: <ColumnSortMenu column={column} w={w} tables={tables} />
    },
    "Style": {
      leftIconPath: mdiFormatColorFill,
      hide: !!column.nested,
      disabledText: column.format?.type === "Media"? "Cannot style a media format column" : undefined,
      style: (column.style?.type && column.style.type !== "None") ? { color: "var(--blue-600)" } : {},
      content: <ColumnStyleControls db={db} 
        tableName={tableName} 
        tables={tables} 
        column={column} 
        onUpdate={onUpdate} 
        tsDataType={column.info?.tsDataType || column.computedConfig?.funcDef.outType.tsDataType || "any"} 
      /> 
    },
    "Display format": {
      style: column.format && column.format.type !== "NONE" ? { color: "var(--blue-600)" } : {},
      leftIconPath: mdiFormatText,
      hide: !!column.nested,
      disabledText: getFormatOptions(column.info || column.computedConfig?.funcDef.outType).length <= 1? "Only text columns can have custom formats at the moment" : undefined,
      content: <ColumnDisplayFormat 
        column={column} 
        tables={props.tables}
        table={props.tables.find(t => t.name === tableName)!}
        onChange={format => {
          onUpdate({ format })
        }}
      />
      },
    "Filter": {
      leftIconPath: mdiFilter,
      hide: !!column.nested,
      disabledText: !validatedColumn?.filter? "Not permitted" : isComputed? "Cannot filter a computed column" : undefined,
      style: (w.filter.some(f => "fieldName" in f && f.fieldName === column.name)) ? { color: "var(--blue-600)" } : {},
    }, 
    "Columns": {
      leftIconPath: mdiViewColumnOutline,
      content: <ColumnsMenu w={w} db={db} tables={tables} onClose={onClose} suggestions={props.suggestions} />
    },
    "Add Computed Column": {
      hide: !!column.nested,
      disabledText: isComputed? "Not allowed on computed columns" : undefined,
      leftIconPath: mdiTableColumnPlusAfter,
      content: <AddComputedColMenu 
        variant="no-popup"
        nestedColumnName={column.nested && column.name}
        onClose={onClose}
        tables={tables}
        w={w}
        db={db}
        selectedColumn={column.name}
        tableHandler={db[tableName]}
      />
    },
    "Apply function": {
      style: column.computedConfig? { color: "var(--blue-600)" } : {},
      leftIconPath: mdiFunction,
      content: table && w.columns && validatedColumn && 
        // <SummariseColumn 
        //   column={column}
        //   columns={w.columns}
        //   onChange={cols => updateWCols(w, cols)}
        //   tableColumns={table.columns}
        // />
        <FunctionSelector 
          selectedFunction={column.computedConfig?.funcDef.key}
          column={validatedColumn.name}
          tableColumns={table.columns}
          wColumns={w.columns}
          onSelect={funcDef => onUpdate({ 
            computedConfig: funcDef && { 
              funcDef, 
              isColumn: column.computedConfig?.isColumn ?? true, 
              column: validatedColumn.name 
            } 
          })}
        />
    },
    "Add Linked Data": {
      style: column.nested? { color: "var(--blue-600)" } : {},
      leftIconPath: mdiLinkPlus,
      disabledText: !table?.joins.length? "No foreign keys to/from this table" : undefined,
      label: `${column.nested? "Edit" : "Add"} Linked Columns`,
      content: <LinkedColumn 
          w={w} 
          tables={tables} 
          column={column} 
          db={db} 
          onClose={onClose}
        />
    },
    "Alter": {
      leftIconPath: mdiTools,
      disabledText: !db.sql? "Not enough privileges" : computedType === "added" ? "Cannot alter a computed column" : undefined,
      hide: isComputed,
      content: !!table && <AlterColumn 
        db={db} 
        table={table} 
        field={column.name} 
        tables={tables} 
        suggestions={props.suggestions} 
        onClose={onClose} 
      />
    },
    "Hide": {
      leftIconPath: mdiEyeOff,
      hide: (w.columns?.filter(c => c.show).length ?? 0) < 2
    },
    "Remove": {
      label: "Remove computed column",
      leftIconPath: mdiEyeRemove,
      style: { color: "var(--red-600)" },
      hide: !computedType || computedType === "column"
    },
    "Hide Others": {
      leftIconPath: mdiEyeOff,
      hide: (w.columns?.filter(c => c.show).length ?? 0) < 2
    },
    "Unhide all": {
      leftIconPath: mdiEye,
      hide: !w.columns?.some(c => !c.show)
    },
  }  as const satisfies TabItems

  const content = (
    <div className="f-1 min-h-0 flex-col" > 
      <Tabs
        compactMode={window.isMobileDevice}
        variant="vertical"
        listClassName="o-auto"
        contentClass={" min-w-300 flex-col ml-p25 o-auto " + (activeKey === "Alter"? " o-auto " : " p-1 ")}
        activeKey={activeKey}
        items={items}
        menuStyle={{ borderRadius: 0  }}
        onChange={async v => {

          if(v === "Add Computed Column"){
            // onClose();
          } else if(v === "Filter"){
            
            const nf: SimpleFilter = await SmartFilter.getDefaultFilter(column)
            w.$update({ filter: [nf, ...w.filter] });
            onClose();
          } else if(v === "Remove"){
            const columns = (w.columns ?? []) //(await TableMenu.getWCols(db[tableName] as any, w, false))
              .filter(cc => column.name !== cc.name);
            updateWCols(w, columns);
            onClose();
          } else if(v === "Hide"){
            const columns = (w.columns ?? []) //(await TableMenu.getWCols(db[tableName] as any, w, false))
              .map(cc => ({ 
                ...cc,
                show: column.name === cc.name? false : cc.show 
              }));
            updateWCols(w, columns);
            onClose();
          } else if(v === "Hide Others"){
            const columns = (w.columns ?? []) //(await TableMenu.getWCols(db[tableName] as any, w, false))
              .map(cc => ({ 
                ...cc,
                show: column.name === cc.name
              }));
            updateWCols(w, columns);
            onClose();
          } else if(v === "Unhide all"){
            const columns = (w.columns ?? []) //(await TableMenu.getWCols(db[tableName] as any, w, false))
              .map(cc => ({ 
                ...cc,
                show: true
              }));
              
            w.$update({ columns });
            onClose();
          }

          setActiveKey(v);
        }}
      /> 
    </div>
  );

  return <Popup
    anchorXY={{ x: state.clientX, y: state.clientY }}
    clickCatchStyle={{ opacity: .5 }}
    key="columnMenu"
    rootStyle={{ padding: 0 }}
    contentClassName={"p-0 "}
    showFullscreenToggle={{}}
    title={colName}
    positioning="beneath-left"
    onClose={onClose}
  >
    {content}
  </Popup>
}

 