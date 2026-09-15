import { auditTrailFilterColumns } from "@common/managedTableSchema";
import Btn from "@components/Btn";
import { mdiHistory } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import SmartTable from "../SmartTable";

type AuditTrailButtonProps = Pick<Prgl, "db" | "sql" | "tables" | "methods"> & {
  table: DBSchemaTableWJoins;
  row: AnyObject | undefined;
};

export const AuditTrailButton = ({
  table,
  row,
  db,
  sql,
  tables,
  methods,
}: AuditTrailButtonProps) => {
  const [showHistory, setShowHistory] = useState(false);
  if (!table.audit || !row) return null;
  const audit = "error" in table.audit ? undefined : table.audit;
  const rowFilter =
    !audit ? undefined : (
      Object.fromEntries(audit.idColumns.map((column) => [column, row[column]]))
    );
  const auditHandler = audit && db[audit.tableName];
  const auditTable = audit && tables.find((t) => t.name === audit.tableName);

  const error =
    "error" in table.audit ? table.audit.error
    : (
      !rowFilter ||
      Object.values(rowFilter).some(
        (value) => value === undefined || value === null,
      ) ||
      !auditHandler?.find ||
      auditTrailFilterColumns.some(
        (name) => !auditTable?.columns.some((c) => c.name === name && c.filter),
      )
    ) ?
      "Insufficient privileges"
    : undefined;

  return (
    <>
      <Btn
        data-command="AuditTrail.open"
        iconPath={mdiHistory}
        title="View audit history"
        disabledInfo={error}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setShowHistory(true);
        }}
      />
      {showHistory && !error && audit && rowFilter && (
        <SmartTable
          db={db}
          sql={sql}
          tables={tables}
          methods={methods}
          tableName={audit.tableName}
          title={`History · ${table.label}`}
          fixedFilter={{
            $and: [
              {
                table_name: table.qualifiedNameParts.name,
                schema_name: table.qualifiedNameParts.schema,
              },
              { $or: [{ old_id: rowFilter }, { new_id: rowFilter }] },
            ],
          }}
          allowEdit={false}
          hideFilters={true}
          realtime={{ throttle: 200 }}
          onClosePopup={() => setShowHistory(false)}
        />
      )}
    </>
  );
};
