import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { ColumnConfigWInfo } from "../W_Table";
import React, { useMemo } from "react";
import { tableMightBeUndefinedDueToAccessControl } from "@common/utils";
import Btn from "@components/Btn";

export const UpdateColumnGlobalConfig = ({
  column,
  tableName,
}: {
  tableName: string;
  column: ColumnConfigWInfo;
}) => {
  const {
    dbs,
    connection: { table_options },
    connectionId,
  } = usePrgl();

  /** Persist column options on close */
  const updateGlobalConfig = useMemo(() => {
    if (!tableMightBeUndefinedDueToAccessControl(dbs.connections)?.update) {
      return;
    }
    return async () => {
      await dbs.connections.update(
        {
          id: connectionId,
        },
        {
          table_options: {
            $merge: [
              {
                ...table_options,
                [tableName]: {
                  ...table_options?.[tableName],
                  columns: {
                    ...table_options?.[tableName]?.columns,
                    [column.name]: {
                      ...table_options?.[tableName]?.columns?.[column.name],
                      renderAs: column.format,
                      style: column.style,
                    },
                  },
                },
              },
            ],
          },
        },
      );
    };
  }, [column, connectionId, dbs.connections, tableName, table_options]);

  return (
    <Btn
      disabledInfo={!updateGlobalConfig ? "Not enough privileges" : undefined}
      onClickPromise={updateGlobalConfig}
      color="action"
      variant="filled"
      title="Set current column settings as default for this table"
    >
      Set as default
    </Btn>
  );
};
