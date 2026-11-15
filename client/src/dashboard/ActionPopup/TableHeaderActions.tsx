import { getFunctionOptions } from "@common/functionOptions";
import { FlexRowWrap } from "@components/Flex";
import type { ServerFunctionHandler } from "prostgles-types";
import React from "react";
import { ActionButton } from "../W_Table/ColumnMenu/ColumnDisplayFormat/ActionButton";

export const TableHeaderActions = ({
  methods,
  tableName,
  className,
}: {
  methods: ServerFunctionHandler;
  tableName: string;
  className?: string;
}) => {
  const headerMethods = getTableHeaderMethods(methods, tableName);
  if (!headerMethods.length) return null;
  return (
    <FlexRowWrap className={className}>
      {headerMethods.map(([name, method]) => (
        <ActionButton key={name} method={method} />
      ))}
    </FlexRowWrap>
  );
};

export const getTableHeaderMethods = (
  methods: ServerFunctionHandler,
  tableName: string,
) =>
  Object.entries(methods).filter(([, method]) =>
    getFunctionOptions(method)?.showInTableHeader?.includes(tableName),
  );
