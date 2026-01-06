import type { TabItems } from "@components/Tabs";
import Tabs from "@components/Tabs";
import {
  mdiChartBar,
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
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useEffect, useState } from "react";

import type {
  TIMECHART_STAT_TYPES,
  TimechartRenderStyle,
} from "../../W_TimeChart/W_TimeChartMenu";
import { AlterColumn } from "./AlterColumn/AlterColumn";
import type {
  BarchartStyle,
  ConditionalStyle,
  ConditionalStyleIcons,
  FixedStyle,
  ScaleStyle,
} from "./ColumnStyleControls/ColumnStyleControls";
import { ColumnStyleControls } from "./ColumnStyleControls/ColumnStyleControls";

import type { DetailedFilter } from "@common/filterUtils";
import Popup from "@components/Popup/Popup";
import {
  includes,
  pickKeys,
  type ParsedJoinPath,
  type ValidatedColumnInfo,
} from "prostgles-types";
import { useReactiveState } from "../../../appUtils";
import type { DBS } from "../../Dashboard/DBS";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type { WindowSyncItem } from "../../Dashboard/dashboardUtils";
import { useEffectAsync } from "../../DashboardMenu/DashboardMenuSettings";
import { getAndFixWColumnsConfig } from "../TableMenu/getAndFixWColumnsConfig";
import type W_Table from "../W_Table";
import type { ColumnConfigWInfo } from "../W_Table";
import { getFullColumnConfig } from "../tableUtils/getFullColumnConfig";
import { updateWCols } from "../tableUtils/tableUtils";
import { AddComputedColMenu } from "./AddComputedColumn/AddComputedColMenu";
import { QuickAddComputedColumn } from "./AddComputedColumn/QuickAddComputedColumn";
import { ColumnDisplayFormat } from "./ColumnDisplayFormat/ColumnDisplayFormat";
import type { ColumnFormat } from "./ColumnDisplayFormat/columnFormatUtils";
import { getFormatOptions } from "./ColumnDisplayFormat/columnFormatUtils";
import { ColumnQuickStats } from "./ColumnQuickStats/ColumnQuickStats";
import { ColumnSortMenu } from "./ColumnSortMenu";
import { ColumnsMenu } from "./ColumnsMenu";
import { FunctionSelector } from "./FunctionSelector/FunctionSelector";
import type { FuncDef } from "./FunctionSelector/functions";
import type { NESTED_COLUMN_DISPLAY_MODES } from "./LinkedColumn/LinkedColumn";
import { LinkedColumn } from "./LinkedColumn/LinkedColumn";
import { useIsMounted } from "prostgles-client";

export type ColumnConfig = {
  idx?: number;
  name: string;
  show?: boolean;
  nested?: {
    path: ParsedJoinPath[];
    columns: Omit<ColumnConfig, "nested">[];
    joinType?: "inner" | "left";
    displayMode?: (typeof NESTED_COLUMN_DISPLAY_MODES)[number]["key"];
    limit?: number;
    sort?: ColumnSort;
    detailedFilter?: DetailedFilter[];
    detailedHaving?: DetailedFilter[];
    chart?: {
      type: "time";
      dateCol: string;
      renderStyle: TimechartRenderStyle | "smooth-line";
      yAxis:
        | {
            isCountAll: false;
            colName: string;
            funcName: (typeof TIMECHART_STAT_TYPES)[number]["func"];
          }
        | {
            isCountAll: true;
          };
    };
  };
  style?:
    | { type: "None" }
    | ConditionalStyle
    | ConditionalStyleIcons
    | FixedStyle
    | ScaleStyle
    | BarchartStyle;
  format?: ColumnFormat;

  /** If present then this is a computed column */
  computedConfig?: Pick<ValidatedColumnInfo, "tsDataType" | "udt_name"> & {
    /**
     * If true then this (name === computedConfig.column) represents an actual column and should not be removed
     */
    isColumn?: boolean;

    /** Out type removed to prevent confusion */
    funcDef: Omit<FuncDef, "outType">;

    /**
     * In case of functions that don't need cols column will be undefined
     */
    column: string | undefined;
    args?: {
      $duration?: { otherColumn: string };
      $string_agg?: { separator: string };
      $template_string?: string;
    };
  };
  width?: number;
};

type P = Pick<CommonWindowProps, "suggestions" | "tables" | "prgl"> & {
  db: DBHandlerClient;
  dbs: DBS;
  w: WindowSyncItem<"table">;
  columnMenuState: W_Table["columnMenuState"];
};

export type ColumnSortSQL = {
  key: string | number;
  asc?: boolean | null;
  nulls?: "first" | "last" | null;
  nullEmpty?: boolean;
};
export type ColumnSort = Omit<ColumnSortSQL, "key"> & {
  key: string;
};

export const ColumnMenu = (props: P) => {
  const { db, tables, prgl } = props;
  const [w, setW] = useState<WindowSyncItem<"table">>(props.w);
  const tableName = w.table_name;
  const [column, setColumn] = useState<ColumnConfigWInfo>();
  const [activeKey, setActiveKey] = useState<string>();
  const { state, setState } = useReactiveState(props.columnMenuState);
  const colName = state?.column;
  const getIsMounted = useIsMounted();

  useEffect(() => {
    const wSub = props.w.$cloneSync((wdata) => {
      if (!getIsMounted()) return;
      setW(wdata);
    });
    return wSub.$unsync;
  }, [setW, getIsMounted, props.w]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffectAsync(async () => {
    if (!w.columns || !Array.isArray(w.columns)) {
      updateWCols(w, await getAndFixWColumnsConfig(tables, w));
    } else if (colName) {
      const column = getFullColumnConfig(tables, w).find(
        (c) => c.name === colName,
      );
      if (!column) {
        console.warn(`Column (${colName}) was not found, delete?!`);
      } else {
        setColumn(column);
      }
    }
  }, [w, colName, tables]);

  const onUpdate = (nc: Partial<ColumnConfig>) => {
    if (!column) return;
    const newCols = w.columns?.map((c, i) => {
      if (c.name === column.name) {
        return { ...c, ...nc };
      }
      return c;
    });
    updateWCols(w, newCols);
  };

  if (!column || !state) return null;

  const onClose = () => {
    setState(undefined);
    setActiveKey(undefined);
  };

  const table = tables.find((t) => t.name === w.table_name);
  const validatedColumn = table?.columns.find((c) => c.name === colName);

  const isComputed = Boolean(
    column.computedConfig ||
    column.nested?.columns.some((c) => c.computedConfig),
  );
  const computedType =
    column.nested ? "nested" : (
      column.computedConfig &&
      (column.computedConfig.isColumn ? "column" : "added")
    );
  const hasSort = w.sort?.some((s) =>
    !column.nested ?
      s.key === column.name
    : column.nested.columns.some((nc) => `${column.name}.${nc.name}`),
  );
  const items = {
    Sort: {
      leftIconPath: mdiSort,
      disabledText:
        !validatedColumn?.orderBy && !column.nested ?
          "Not permitted"
        : undefined,
      style: hasSort ? { color: "var(--active)" } : {},
      content: <ColumnSortMenu column={column} w={w} tables={tables} />,
    },
    Style: {
      leftIconPath: mdiFormatColorFill,
      hide: !!column.nested,
      disabledText:
        column.format?.type === "Media" ?
          "Cannot style a media format column"
        : undefined,
      style:
        column.style?.type && column.style.type !== "None" ?
          { color: "var(--active)" }
        : {},
      content: (
        <ColumnStyleControls
          db={db}
          tableName={tableName}
          tables={tables}
          column={column}
          onUpdate={onUpdate}
          tsDataType={
            column.info?.tsDataType ||
            column.computedConfig?.tsDataType ||
            "any"
          }
          udt_name={
            column.info?.udt_name || column.computedConfig?.udt_name || "text"
          }
        />
      ),
    },
    "Display format": {
      style:
        column.format && column.format.type !== "NONE" ?
          { color: "var(--active)" }
        : {},
      leftIconPath: mdiFormatText,
      hide: !!column.nested,
      disabledText:
        getFormatOptions(column.info || column.computedConfig).length <= 1 ?
          "Only text columns can have custom formats at the moment"
        : undefined,
      content: (
        <ColumnDisplayFormat
          db={db}
          column={column}
          tables={props.tables}
          table={props.tables.find((t) => t.name === tableName)!}
          onChange={(format) => {
            onUpdate({ format });
          }}
        />
      ),
    },
    Filter: {
      leftIconPath: mdiFilter,
      hide: !!column.nested,
      disabledText:
        !validatedColumn?.filter ? "Not permitted"
        : isComputed ? "Cannot filter a computed column"
        : undefined,
      style:
        w.filter.some((f) => "fieldName" in f && f.fieldName === column.name) ?
          { color: "var(--active)" }
        : {},
    },
    "Quick Stats": {
      leftIconPath: mdiChartBar,
      hide: !!column.nested,
      disabledText:
        isComputed ? "Cannot add quick stats on a computed column"
        : (
          validatedColumn?.udt_name.startsWith("geo") ||
          includes(["json", "xml"], validatedColumn?.udt_name)
        ) ?
          `Not supported for ${validatedColumn.udt_name} columns`
        : undefined,
      content: table && w.columns && validatedColumn && (
        <ColumnQuickStats column={validatedColumn} db={db} w={w} />
      ),
    },
    Columns: {
      leftIconPath: mdiViewColumnOutline,
      content: (
        <ColumnsMenu
          w={w}
          db={db}
          tables={tables}
          onClose={onClose}
          suggestions={props.suggestions}
          nestedColumnOpts={undefined}
        />
      ),
    },
    "Add Computed Column": {
      hide: !!column.nested || isComputed,
      disabledText: isComputed ? "Not allowed on computed columns" : undefined,
      leftIconPath: mdiTableColumnPlusAfter,
      content: (
        <AddComputedColMenu
          variant="no-popup"
          nestedColumnOpts={
            column.nested ? { type: "existing", config: column } : undefined
          }
          onClose={onClose}
          tables={tables}
          w={w}
          db={db}
          selectedColumn={column.name}
          tableHandler={db[tableName]}
        />
      ),
    },
    "Edit Computed Column": {
      hide: !isComputed,
      leftIconPath: mdiTableColumnPlusAfter,
      style: { color: "var(--active)" },
      content: (
        <QuickAddComputedColumn
          existingColumn={column}
          onAddColumn={(newCol) => {
            updateWCols(
              w,
              (w.columns ?? []).map((c) => {
                if (c.name === column.name) {
                  return {
                    ...c,
                    ...newCol,
                  };
                }
                return c;
              }),
            );
            onClose();
          }}
          tableName={tableName}
        />
      ),
    },
    "Apply function": {
      style: column.computedConfig ? { color: "var(--active)" } : {},
      leftIconPath: mdiFunction,
      hide:
        !!column.nested ||
        (column.computedConfig && !column.computedConfig.isColumn),
      content: table && w.columns && validatedColumn && (
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
          onSelect={(funcDef) =>
            onUpdate({
              computedConfig: funcDef && {
                ...pickKeys(validatedColumn, ["tsDataType", "udt_name"]),
                funcDef,
                isColumn: column.computedConfig?.isColumn ?? true,
                column: validatedColumn.name,
              },
            })
          }
        />
      ),
    },
    "Add Linked Data": {
      style: column.nested ? { color: "var(--active)" } : {},
      leftIconPath: mdiLinkPlus,
      disabledText:
        !table?.joinsV2.length ?
          "No foreign keys to/from this table"
        : undefined,
      label: `${column.nested ? "Edit" : "Add"} Linked Columns`,
      content: <LinkedColumn w={w} column={column} onClose={onClose} />,
    },
    Alter: {
      leftIconPath: mdiTools,
      disabledText:
        !db.sql ? "Not enough privileges"
        : computedType === "added" ? "Cannot alter a computed column"
        : undefined,
      hide: isComputed,
      content: !!table && (
        <AlterColumn
          table={table}
          field={column.name}
          prgl={prgl}
          suggestions={props.suggestions}
          onClose={onClose}
        />
      ),
    },
    Hide: {
      leftIconPath: mdiEyeOff,
      hide: (w.columns?.filter((c) => c.show).length ?? 0) < 2,
    },
    Remove: {
      label: "Remove computed column",
      leftIconPath: mdiEyeRemove,
      style: { color: "var(--text-warning)" },
      hide: !computedType || computedType === "column",
    },
    "Hide Others": {
      leftIconPath: mdiEyeOff,
      hide: (w.columns?.filter((c) => c.show).length ?? 0) < 2,
    },
    "Unhide all": {
      leftIconPath: mdiEye,
      hide: !w.columns?.some((c) => !c.show),
    },
  } as const satisfies TabItems;

  const content = (
    <div className="min-h-0 flex-col">
      <Tabs
        compactMode={window.isMobileDevice ? "hide-inactive" : undefined}
        variant="vertical"
        listClassName="o-auto"
        contentClass={
          " min-w-300 flex-col ml-p25 o-auto " +
          (activeKey === "Alter" ? " o-auto " : " p-1 ")
        }
        activeKey={activeKey as any}
        items={items}
        menuStyle={{ borderRadius: 0 }}
        onChange={async (v) => {
          if (v === "Add Computed Column") {
            // onClose();
          } else if (v === "Filter") {
            const nf: DetailedFilter = await getDefaultFilter(column);
            w.$update({ filter: [nf, ...w.filter] });
            onClose();
          } else if (v === "Remove") {
            const columns = (w.columns ?? []) //(await TableMenu.getWCols(db[tableName] as any, w, false))
              .filter((cc) => column.name !== cc.name);
            updateWCols(w, columns);
            onClose();
          } else if (v === "Hide") {
            const columns = (w.columns ?? []) //(await TableMenu.getWCols(db[tableName] as any, w, false))
              .map((cc) => ({
                ...cc,
                show: column.name === cc.name ? false : cc.show,
              }));
            updateWCols(w, columns);
            onClose();
          } else if (v === "Hide Others") {
            const columns = (w.columns ?? []) //(await TableMenu.getWCols(db[tableName] as any, w, false))
              .map((cc) => ({
                ...cc,
                show: column.name === cc.name,
              }));
            updateWCols(w, columns);
            onClose();
          } else if (v === "Unhide all") {
            const columns = (w.columns ?? []) //(await TableMenu.getWCols(db[tableName] as any, w, false))
              .map((cc) => ({
                ...cc,
                show: true,
              }));

            w.$update({ columns });
            onClose();
          }

          setActiveKey(v);
        }}
      />
    </div>
  );

  return (
    <Popup
      anchorXY={{ x: state.clientX, y: state.clientY }}
      clickCatchStyle={{ opacity: 0.5 }}
      key="columnMenu"
      rootStyle={{ padding: 0 }}
      contentClassName={"p-0 o-none"}
      showFullscreenToggle={{}}
      title={colName}
      positioning="beneath-left"
      onClose={onClose}
      fixedTopLeft={false}
    >
      {content}
    </Popup>
  );
};

/** undefined value means filter is disabled (gray col name text) */
const getDefaultFilter = (col: ColumnConfigWInfo): DetailedFilter => {
  const isNumeric = ["number", "Date"].includes(
    col.info?.tsDataType || (col.computedConfig?.funcDef.tsDataTypeCol as any),
  );
  const nf: DetailedFilter = {
    fieldName: col.name,
    type:
      col.info?.is_pkey || col.info?.references?.length ? "="
      : isNumeric ? "$between"
      : "$in",
  };

  return nf;
};
