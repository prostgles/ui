import { mdiFilter, mdiFunction, mdiKey, mdiLink } from "@mdi/js";
import type { AnyObject } from "prostgles-types";

import React from "react";

import Btn from "../../../components/Btn";

import { quickClone } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { FlexRow } from "../../../components/Flex";
import { Icon } from "../../../components/Icon/Icon";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type { WindowSyncItem } from "../../Dashboard/dashboardUtils";
import type W_Table from "../W_Table";
import type {
  ColumnConfigWInfo,
  MinMaxVals,
  ProstglesColumn,
  W_TableProps,
} from "../W_Table";
import type { OnClickEditRow } from "./getEditColumn";
import { getEditColumn } from "./getEditColumn";
import { onRenderColumn } from "./onRenderColumn";
import { getCellStyle } from "./StyledTableColumn";
import { getFullColumnConfig } from "./tableUtils";

export type ProstglesTableColumn = ProstglesColumn & ColumnConfigWInfo;

type GetTableColsArgs = Pick<W_TableProps, "prgl"> &
  Pick<CommonWindowProps, "suggestions"> & {
    data?: AnyObject[];
    w?: WindowSyncItem<"table">;
    windowWidth?: number;
    onClickEditRow: OnClickEditRow;
    barchartVals: MinMaxVals | undefined;
    allowMediaSkip?: boolean;
    hideEditRow?: boolean;
    columnMenuState?: W_Table["columnMenuState"];
  };
export const getTableCols = ({
  w,
  prgl: { db, tables },
  data,
  windowWidth,
  onClickEditRow,
  barchartVals,
  suggestions,
  hideEditRow,
  columnMenuState,
}: GetTableColsArgs): ProstglesTableColumn[] => {
  let tblCols: ProstglesTableColumn[] = [];

  if (!w) return tblCols;

  const tableName = w.table_name;

  const table = tables.find((t) => t.name === tableName);
  const columns = table?.columns;

  if (columns) {
    const _fullConfigCols = getFullColumnConfig(tables, w, data, windowWidth);
    const fullConfigCols = _fullConfigCols
      .filter((c) => c.show)
      .map((_c) => {
        const c: ColumnConfigWInfo = quickClone(_c);

        const { tsDataType = "any", udt_name = "text" } =
          (c.computedConfig ? c.computedConfig.funcDef.outType : c.info) ?? {};

        return {
          ...c,
          tsDataType,
          udt_name,
        };
      });

    //@ts-ignore
    tblCols = fullConfigCols.map((c) => {
      const nestedCols =
        !c.nested ? null
        : c.nested.chart ?
          ` (${c.nested.chart.dateCol}, ${
            c.nested.chart.yAxis.isCountAll ?
              "COUNT(*)"
            : `${c.nested.chart.yAxis.funcName.slice(1).toUpperCase()}(${c.nested.chart.yAxis.colName})`
          })`
        : "";
      // ` (${sliceText(c.nested.columns.filter(c => c.show).map(c => c.name).join(", "), 20)})`;

      const subLabel = (
        <div className="flex-row ai-center">
          {(c.computedConfig || c.format) && (
            <Icon
              path={mdiFunction}
              size={0.75}
              className={"color-action ml-p25"}
            />
          )}
          {c.info?.is_pkey ?
            <div title="Primary key" className="flex-row ai-center">
              <Icon path={mdiKey} size={0.75} className="mr-p25" />
              {c.info.udt_name}
            </div>
          : (nestedCols ?? (!c.computedConfig ? c.info?.udt_name : null))}
          {/* {c.computedConfig && (c.computedConfig.funcDef.outType.udt_name)} */}
          {(
            !w.filter.some(
              (f) => "fieldName" in f && f.fieldName === c.name && !f.disabled,
            )
          ) ?
            null
          : <Btn
              title="Has active filter"
              iconPath={mdiFilter}
              style={{ padding: 0 }}
              size={"micro"}
              className={"color-action ml-p25"}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();

                const _w = w;
                _w.$update(
                  { options: { showFilters: !_w.options.showFilters } },
                  { deepMerge: true },
                );
              }}
            />}
        </div>
      );

      let labelText = c.name;
      let labelIcon = "";
      if (c.computedConfig?.isColumn) {
        labelIcon = mdiFunction;
        labelText = `${c.computedConfig.funcDef.label}(${c.name})`;
      } else if (c.info?.references || c.nested) {
        labelIcon = mdiLink;
      }
      const title =
        c.nested ?
          `${c.name} (${c.nested.path.at(-1)?.table} data)`
        : [
            //@ts-ignore
            c.name,
            c.udt_name,
            c.info?.comment || "",
            c.info?.references ?
              `references ${c.info.references.map((r) => r.ftable)}`
            : "",
          ]
            .filter((v) => v)
            .join("\n");
      const tableColumn: ProstglesTableColumn = {
        ...c,
        filter: c.info?.filter ?? false,
        sortable:
          c.nested ?
            {
              column: c,
              tables,
              w,
            }
          : !!c.computedConfig ||
            (!!c.info?.orderBy &&
              c.info.udt_name !== "json" &&
              (c.info as any)?.udt_name !== "point"),
        computed: !!c.computedConfig,
        key: c.name,
        label:
          labelIcon ?
            <FlexRow className="ai-none jc-none gap-p5">
              <Icon className="f-0" path={labelIcon} size={0.75} /> {labelText}
            </FlexRow>
          : labelText,
        subLabelTitle: "Data type",
        subLabel,
        title,
        hidden: c.name === "$rowhash",
        width: c.width ?? 100,

        onRender: onRenderColumn({
          c,
          table,
          tables,
          barchartVals,
          maxCellChars: w.options.maxCellChars,
        }),

        /**
         * Set color based on data type?!
         */
        getCellStyle: (row) => {
          if (c.style?.type === "Scale" && barchartVals?.[c.name]) {
            const style = getCellStyle(c, c, row, barchartVals[c.name]);
            if (!style?.cellColor && !style?.textColor) {
              return {};
            }
            return {
              ...(style.cellColor && {
                backgroundColor: style.cellColor,
                borderColor: style.cellColor,
              }),
              ...(style.textColor && { color: `${style.textColor}` }),
            };
          }
          return c.format?.type === "Media" ? { display: "flex" } : {};
        },
        onContextMenu: (e: React.MouseEvent, n: HTMLElement) => {
          e.preventDefault();
          const { x, y } = e.currentTarget.getBoundingClientRect();
          columnMenuState?.set({ column: c.name, clientX: x, clientY: y });

          return false;
        },
      };

      return tableColumn;
    });
  }

  const tableHandler = db[tableName];

  /* Can update table. Add update button */
  if (tableHandler && !hideEditRow && !w.options.hideEditRow) {
    const _columns = (columns ?? []).filter(
      (c) =>
        !w.columns?.length ||
        w.columns.some((wc) => wc.name === c.name && wc.show !== false),
    );
    const editColumn = getEditColumn({
      columns: _columns,
      tableHandler,
      addColumnProps: {
        w,
        tables,
        db,
        suggestions,
        nestedColumnOpts: undefined,
      },
      onClickRow: onClickEditRow,
    });
    tblCols.unshift(editColumn);
  }

  return tblCols;
};
