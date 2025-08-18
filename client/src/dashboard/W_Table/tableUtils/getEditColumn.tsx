import { mdiOpenInNew, mdiPencilOutline } from "@mdi/js";
import type { TableHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject, ValidatedColumnInfo } from "prostgles-types";
import React from "react";
import Btn from "../../../components/Btn";

import { type DetailedFilterBase } from "../../../../../common/filterUtils";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import type { AddColumnMenuProps } from "../ColumnMenu/AddColumnMenu";
import { AddColumnMenu } from "../ColumnMenu/AddColumnMenu";
import type { ProstglesColumn } from "../W_Table";
import { getRowFilter } from "./getRowFilter";

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
  tableHandler: Partial<TableHandlerClient>;
  onClickRow: OnClickEditRow;
  table: DBSchemaTableWJoins;
  columnConfig: { name: string }[] | undefined;
  addColumnProps?: AddColumnMenuProps;
};
export const getEditColumn = ({
  tableHandler,
  onClickRow,
  addColumnProps,
  table,
  columnConfig,
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
            table,
            columnConfig,
            tableHandler,
          );
          if (error) {
            alert(error);
          } else if (filter) {
            const siblingData = await getRowSiblingData(
              [prevRow, row, nextRow],
              1,
              table,
              columnConfig,
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

export type CoreColInfo = Pick<
  ValidatedColumnInfo,
  "filter" | "is_pkey" | "name" | "tsDataType" | "udt_name"
>;

export const getRowSiblingData = async (
  rows: (AnyObject | undefined)[],
  rowIndex: number,
  table: DBSchemaTableWJoins,
  columns: GetMenuColumnArgs["columnConfig"],
  tableHandler: Partial<TableHandlerClient<AnyObject, void>>,
) => {
  const prevRow = rows[rowIndex - 1];
  const nextRow = rows[rowIndex + 1];

  let prevRowFilter: undefined | DetailedFilterBase[];
  let nextRowFilter: undefined | DetailedFilterBase[];
  try {
    if (prevRow)
      prevRowFilter = (
        await getRowFilter(prevRow, table, columns, tableHandler)
      ).filter;
    if (nextRow)
      nextRowFilter = (
        await getRowFilter(nextRow, table, columns, tableHandler)
      ).filter;
  } catch (e) {
    console.error(e);
  }
  return { nextRow, prevRow, prevRowFilter, nextRowFilter };
};
