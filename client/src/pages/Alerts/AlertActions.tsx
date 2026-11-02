import { FlexRowWrap } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { getActionFunctions, type AnyObject } from "prostgles-types";
import React from "react";
import type { DBSchemaTableWJoins } from "../../dashboard/Dashboard/dashboardUtils";
import { ActionButton } from "../../dashboard/W_Table/ColumnMenu/ColumnDisplayFormat/ActionButton";
import { getActionButtonState } from "../../dashboard/W_Table/ColumnMenu/ColumnDisplayFormat/getActionButtonState";

export const AlertActions = ({
  table,
  row,
}: {
  table: DBSchemaTableWJoins;
  row: AnyObject;
}) => {
  const { methods } = usePrgl();
  return (
    <FlexRowWrap className="p-p5 gap-p5">
      {getActionFunctions(methods, table).map(({ methodName, argName }) => (
        <ActionButton
          key={`${methodName}:${argName}`}
          table={table}
          state={getActionButtonState({
            methods,
            table,
            params: { methodName, argName },
            row,
            queryRow: row,
            stateKey: methodName,
          })}
        />
      ))}
    </FlexRowWrap>
  );
};
