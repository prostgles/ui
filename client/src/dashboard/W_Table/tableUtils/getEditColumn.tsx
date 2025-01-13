import { mdiCrossBolnisi, mdiOpenInNew, mdiPencilOutline } from "@mdi/js";
import type { AnyObject } from "prostgles-types";

import React from "react";

import { isEmpty } from "../../../utils";
// const sanitizeHtml = _sanitizeHtml as any;

import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import type { ValidatedColumnInfo } from "prostgles-types/lib";
import Btn from "../../../components/Btn";

import type { DetailedFilterBase } from "../../../../../commonTypes/filterUtils";
import { getSmartGroupFilter } from "../../SmartFilter/SmartFilter";
import type { AddColumnMenuProps } from "../ColumnMenu/AddColumnMenu";
import { AddColumnMenu } from "../ColumnMenu/AddColumnMenu";
import type { ProstglesColumn } from "../W_Table";

export const getUnknownColInfo = (
  key: string,
  label: string,
  dataType: ValidatedColumnInfo["tsDataType"],
  computed,
): ProstglesColumn => ({
  key,
  name: label,
  label,
  sortable: ["string", "number", "boolean", "Date"].includes(dataType),
  tsDataType: dataType,
  udt_name: "text",
  filter: true,
  computed,
});

export type RowSiblingData = {
  prevRow: AnyObject | undefined;
  nextRow: AnyObject | undefined;
  prevRowFilter: DetailedFilterBase[] | undefined;
  nextRowFilter: DetailedFilterBase[] | undefined;
};
export type OnClickEditRow = (
  filter: DetailedFilterBase[],
  siblingData: RowSiblingData,
  rowIndex: number,
  fixedUpdateData?: AnyObject,
) => void;

type GetMenuColumnArgs = {
  columns: ValidatedColumnInfo[];
  tableHandler: Partial<TableHandlerClient>;
  onClickRow: OnClickEditRow;
  addColumnProps?: AddColumnMenuProps;
};
export const getEditColumn = ({
  columns,
  tableHandler,
  onClickRow,
  addColumnProps,
}: GetMenuColumnArgs): ProstglesColumn => {
  const viewOnly = !tableHandler.update;
  const title = viewOnly ? "View row" : "View/Edit row",
    iconPath = viewOnly ? mdiOpenInNew : mdiPencilOutline;

  const res: ProstglesColumn = {
    ...getUnknownColInfo("edit_row", " ", "any", true),
    filter: false,
    sortable: false,
    label: addColumnProps && <AddColumnMenu {...addColumnProps} />,
    hidden: false,
    width: 50,
    getCellStyle: () => ({ padding: 0 }),
    onRender: ({ row, nextRow, prevRow, rowIndex }) => (
      <Btn
        className={
          "h-full h-fit w-fit" +
          (window.isMobileDevice ? " text-3 " : " show-on-row-hover  ")
        }
        title={title}
        data-command="dashboard.window.viewEditRow"
        iconPath={iconPath}
        style={{ padding: "12px" }}
        color="action"
        onClickMessage={async (e, setM) => {
          e.stopPropagation();

          setM({ loading: 1 });
          const { error, filter } = await getRowFilter(
            row,
            columns,
            tableHandler,
          );
          if (error) {
            alert(error);
          } else if (filter) {
            const siblingData = await getRowSiblingData(
              [prevRow, row, nextRow],
              1,
              columns,
              tableHandler,
            );
            onClickRow(filter, siblingData, rowIndex);
          }
          setM({ loading: 0 });
        }}
      />
    ),
  };

  return res;
};

type CoreColInfo = Pick<
  ValidatedColumnInfo,
  "filter" | "is_pkey" | "name" | "tsDataType" | "udt_name"
>;

export const getRowSiblingData = async (
  rows: (AnyObject | undefined)[],
  rowIndex: number,
  columns: CoreColInfo[],
  tableHandler: Partial<TableHandlerClient<AnyObject, void>>,
) => {
  const prevRow = rows[rowIndex - 1];
  const nextRow = rows[rowIndex + 1];

  let prevRowFilter: undefined | DetailedFilterBase[];
  let nextRowFilter: undefined | DetailedFilterBase[];
  try {
    if (prevRow)
      prevRowFilter = (await getRowFilter(prevRow, columns, tableHandler))
        .filter;
    if (nextRow)
      nextRowFilter = (await getRowFilter(nextRow, columns, tableHandler))
        .filter;
  } catch (e) {
    console.error(e);
  }
  return { nextRow, prevRow, prevRowFilter, nextRowFilter };
};

export const getRowFilter = async (
  row: AnyObject,
  columns: CoreColInfo[],
  tableHandler: Partial<TableHandlerClient<AnyObject, void>>,
): Promise<
  | { filter: DetailedFilterBase[]; error: undefined }
  | { filter: undefined; error: string }
> => {
  let rowFilter: DetailedFilterBase[] | undefined;
  const pkeys = columns.filter((c) => c.filter && c.is_pkey);
  if (pkeys.length) {
    pkeys.map((pkey) => {
      rowFilter ??= [];
      rowFilter.push({
        fieldName: pkey.name,
        value: row[pkey.name],
      });
    });
  } else {
    const dissallowedUdtTypes = ["interval"];
    const filterCols = columns.filter(
      (c) =>
        !dissallowedUdtTypes.includes(c.udt_name) &&
        c.filter &&
        (["number", "string", "boolean", "Date"].includes(c.tsDataType) ||
          c.udt_name === "jsonb"),
    );

    /** Trim value if too long to avoid btrim error */
    const getSlicedValue = (v) => {
      if (typeof v === "string" && v.length > 400) {
        return { $like: `${v.slice(0, 400)}%` };
      }

      return v;
    };

    rowFilter = filterCols.map((c) => {
      const val = row[c.name];
      return {
        fieldName: c.name,
        value:
          (
            c.udt_name.startsWith("json") &&
            typeof val === "string" &&
            !val.startsWith('"')
          ) ?
            JSON.stringify(val)
          : getSlicedValue(val),
      };
    });
    rowFilter = rowFilter.filter((f, i, arr) => {
      const filterStrLen = JSON.stringify(
        getSmartGroupFilter(arr.slice(0, i + 1)),
      ).length;
      return filterStrLen * 4 < 2104;
    });
  }

  const _rowFilter = getSmartGroupFilter(rowFilter);
  /** This check is needed for subscriptions */
  if (JSON.stringify(_rowFilter).length * 4 > 2704 || isEmpty(_rowFilter)) {
    return {
      filter: undefined,
      error:
        "Could not create filter for record" +
        (!pkeys.length ? ". Create a primary key to fix this issue" : ""),
    };
  }

  const [firstRecord, secondRecord] =
    (await tableHandler.find?.(_rowFilter, { select: "", limit: 2 })) ?? [];
  if (!firstRecord) {
    console.log(_rowFilter);
    return {
      filter: undefined,
      error: "Could not create a single row filter. Record not found.",
    };
  } else if (secondRecord) {
    return {
      filter: undefined,
      error:
        "Could not create a single row filter. More than one record returned" +
        (!pkeys.length ? ". Create a primary key to fix this issue" : ""),
    };
  } else {
    return { filter: rowFilter ?? [], error: undefined };
  }
};
