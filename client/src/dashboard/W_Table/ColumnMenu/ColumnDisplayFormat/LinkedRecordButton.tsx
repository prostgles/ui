import type { DetailedFilterBase } from "@common/filterUtils";
import Btn from "@components/Btn";
import React, { useState } from "react";
import type { Prgl } from "src/App";
import { SmartForm } from "../../../SmartForm/SmartForm";
import type { DBSchemaTableWJoins } from "../../../Dashboard/dashboardUtils";

type LinkedRecordButtonProps = Pick<
  Prgl,
  "db" | "methods" | "sql" | "tables"
> & {
  children: React.ReactNode;
  buttonProps?: Pick<
    React.ComponentProps<typeof Btn>,
    "variant" | "style" | "className"
  >;
  rowFilter: DetailedFilterBase[];
  table: DBSchemaTableWJoins;
};

export const LinkedRecordButton = ({
  children,
  buttonProps,
  db,
  methods,
  rowFilter,
  sql,
  table,
  tables,
}: LinkedRecordButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

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
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(true);
        }}
      >
        {children}
      </Btn>
      {isOpen && (
        <SmartForm
          db={db}
          methods={methods}
          sql={sql}
          tables={tables}
          asPopup={true}
          tableName={table.name}
          rowFilter={rowFilter}
          confirmUpdates={true}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
