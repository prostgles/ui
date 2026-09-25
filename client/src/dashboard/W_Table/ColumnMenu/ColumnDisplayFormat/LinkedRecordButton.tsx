import type { DetailedFilterBase } from "@common/filterUtils";
import Btn from "@components/Btn";
import type { AnyObject } from "prostgles-types";
import React, { useState } from "react";
import type { Prgl } from "src/App";
import { SmartForm } from "../../../SmartForm/SmartForm";
import type { DBSchemaTableWJoins } from "../../../Dashboard/dashboardUtils";
import { getRowFilter } from "../../tableUtils/getRowFilter";
import { getTableIdentityColumns } from "./getTableIdentityColumns";

type LinkedRecordButtonProps = Pick<
  Prgl,
  "db" | "methods" | "sql" | "tables"
> & {
  children: React.ReactNode;
  buttonProps?: Pick<
    React.ComponentProps<typeof Btn>,
    "variant" | "style" | "className"
  >;
  row: AnyObject;
  table: DBSchemaTableWJoins;
};

export const LinkedRecordButton = ({
  children,
  buttonProps,
  db,
  methods,
  row,
  sql,
  table,
  tables,
}: LinkedRecordButtonProps) => {
  const [rowFilter, setRowFilter] = useState<DetailedFilterBase[]>();
  const tableHandler = db[table.name];
  const identityColumns = getTableIdentityColumns(table);
  const canOpenRecord =
    !!tableHandler?.find &&
    identityColumns.length > 0 &&
    identityColumns.every(({ name }) => row[name] !== undefined);

  if (!canOpenRecord) return <>{children}</>;

  return (
    <>
      <Btn
        variant="faded"
        color="action"
        size="small"
        className="max-w-full text-ellipsis"
        {...buttonProps}
        title={`Open ${table.label}`}
        data-command="LinkedColumn.OpenRecord"
        onClickPromise={async (event) => {
          event.stopPropagation();
          const result = await getRowFilter(
            row,
            table,
            identityColumns,
            tableHandler,
          );
          if (result.error) {
            throw result.error;
          }
          setRowFilter(result.filter);
        }}
      >
        {children}
      </Btn>
      {rowFilter && (
        <SmartForm
          db={db}
          methods={methods}
          sql={sql}
          tables={tables}
          asPopup={true}
          tableName={table.name}
          rowFilter={rowFilter}
          confirmUpdates={true}
          onClose={() => setRowFilter(undefined)}
        />
      )}
    </>
  );
};
