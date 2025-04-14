import React from "react";
import type { TableProps } from "./Table";
import { classOverride } from "../Flex";

type P = TableProps<any> &
  React.HTMLAttributes<HTMLDivElement> & {
    fixedLeftColumns: TableProps<any>["cols"];
  };
export const TableWithFixedColumns = ({ fixedLeftColumns, ...props }: P) => {
  return (
    <div className={classOverride("TableWithFixedColumns", props.className)}>
      TableWithFixedColumns
    </div>
  );
};
