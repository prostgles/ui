import { mdiFilter, mdiFunction, mdiKey, mdiLink } from "@mdi/js";
import { _PG_numbers, includes, type AnyObject } from "prostgles-types";

import React from "react";

import Btn from "@components/Btn";

import { FlexRow } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import type { TableHandlerClient } from "prostgles-client";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type { WindowSyncItem } from "../../Dashboard/dashboardUtils";
import { onRenderColumn } from "../RenderColumn/onRenderColumn";
import {
  getCellStyle,
  getSingleShownNestedColumn,
} from "../RenderColumn/StyledTableColumn";
import type W_Table from "../W_Table";
import type {
  ColumnConfigWithInfo,
  MinMaxVals,
  ProstglesColumn,
  W_TableProps,
} from "../W_Table";
import { getColumnsWithInfoAndWidth } from "./getColumnsWithInfoAndWidth";
import type { OnClickEditRow } from "./getEditColumn";
import { getEditColumn } from "./getEditColumn";
import { getColumnFormat } from "../ColumnMenu/ColumnDisplayFormat/getFormatColumnSelect";

export type ProstglesTableColumn = ProstglesColumn &
  Omit<ColumnConfigWithInfo, "label">;

type GetTableColsArgs = Pick<W_TableProps["prgl"], "db" | "tables" | "sql"> &
  Pick<CommonWindowProps, "suggestions"> & {
    data?: AnyObject[];
    w?: WindowSyncItem<"table">;
    windowWidth?: number;
    onClickEditRow: OnClickEditRow;
    barchartVals: MinMaxVals | undefined;
    allowMediaSkip?: boolean;
    hideEditRow?: boolean;
    columnMenuState?: W_Table["columnMenuState"];
    opts?: Pick<Partial<ProstglesTableColumn>, "noRightBorder">;
  };
export const getTableCols = ({
  w,
  db,
  tables,
  data,
  windowWidth,
  onClickEditRow,
  barchartVals,
  suggestions,
  hideEditRow,
  columnMenuState,
  opts,
  sql,
}: GetTableColsArgs): ProstglesTableColumn[] => {
  if (!w) return [];

  const tableName = w.table_name;

  const table = tables.find((t) => t.name === tableName);
  const columns = table?.columns;

  if (!columns) {
    return [];
  }

  const fullConfigCols = getColumnsWithInfoAndWidth(
    tables,
    w,
    data,
    windowWidth,
  ).filter((c) => c.show);

  const tblCols: ProstglesTableColumn[] = fullConfigCols.map((c) => {
    const renderColumn = c;
    const format = getColumnFormat(c);
    const nestedCols =
      !c.nested ? null
      : c.nested.display?.type === "timechart" ?
        ` (${c.nested.display.dateCol}, ${
          c.nested.display.yAxis.isCountAll ?
            "COUNT(*)"
          : `${c.nested.display.yAxis.funcName.slice(1).toUpperCase()}(${c.nested.display.yAxis.colName})`
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
              void _w.$update(
                { options: { showFilters: !_w.options.showFilters } },
                { deepMerge: true },
              );
            }}
          />}
      </div>
    );

    let labelText = c.label || c.info?.label || c.name;
    let labelIcon = "";
    if (c.computedConfig?.isColumn && !c.label) {
      labelIcon = mdiFunction;
      labelText = `${c.computedConfig.funcDef.label}(${c.name})`;
    } else if (c.info?.references || c.nested) {
      labelIcon = mdiLink;
    }
    const title =
      c.nested ?
        `${c.name} (${c.nested.path.at(-1)?.table} data)`
      : [
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
            c.info.udt_name !== "point"),
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
      noRightBorder: opts?.noRightBorder ?? false,
      onRender: onRenderColumn({
        column: renderColumn,
        table,
        tables,
        barchartVals,
        maxCellChars: w.options.maxCellChars,
        getValues: () => {
          return data?.map((r) => r[c.name]) ?? [];
        },
      }),

      /**
       * Set color based on data type?!
       */
      getCellStyle: (row) => {
        const chartValues = barchartVals?.get(c.name);
        if (
          !c.nested &&
          c.style?.type === "Scale" &&
          chartValues
        ) {
          const style = getCellStyle(
            c,
            row[c.name],
            chartValues.type === "nested" ? undefined : chartValues.range,
          );
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
        const isMedia =
          format?.type === "Media" ||
          (format?.type === "Internal" && format.params.component === "File");
        const nestedValue =
          c.nested?.display?.type !== "drillable-records" &&
          c.nested?.display?.type !== "timechart" &&
          getSingleShownNestedColumn(c, tables);
        const numericType =
          nestedValue ? nestedValue.colInfo.udt_name : c.udt_name;
        const isNumeric = includes(_PG_numbers, numericType);
        return {
          ...(isMedia && { display: "flex" }),
          ...(isNumeric && { textAlign: "right" }),
        };
      },
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const { x, y } = e.currentTarget.getBoundingClientRect();
        columnMenuState?.set({ column: c.name, clientX: x, clientY: y });

        return false;
      },
    };

    return tableColumn;
  });
  const tableHandler = db[tableName] as TableHandlerClient | undefined;

  /* Can update table. Add update button */
  if (tableHandler && !hideEditRow && !w.options.hideEditRow) {
    const editColumn = getEditColumn({
      table,
      columnConfig: fullConfigCols,
      tableHandler,
      addColumnProps: {
        w,
        tables,
        db,
        sql,
        suggestions,
        nestedColumnOpts: undefined,
      },
      onClickRow: onClickEditRow,
    });
    tblCols.unshift(editColumn);
  }

  return tblCols;
};
