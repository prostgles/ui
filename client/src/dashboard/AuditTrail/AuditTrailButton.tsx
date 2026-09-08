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
  const auditTable = tables.find(
    (candidate) => candidate.name === audit?.tableName,
  );
  const auditHandler = audit && db[audit.tableName];
  const auditColumnNames = new Set(
    auditTable?.columns
      .filter((column) => column.select)
      .map((column) => column.name),
  );
  const requiredColumns = audit && ["entity_type", "old_id", "new_id"];

  const selectedColumns = [
    "created_at",
    "actor",
    "operation",
    "old_row",
    "new_row",
  ].filter((column) => auditColumnNames.has(column));

  const error =
    "error" in table.audit ? table.audit.error
    : (
      !rowFilter ||
      !selectedColumns.length ||
      Object.values(rowFilter).some(
        (value) => value === undefined || value === null,
      ) ||
      !auditHandler?.find ||
      !requiredColumns?.every((name) =>
        auditTable?.columns.some(
          (column) => column.name === name && column.select && column.filter,
        ),
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
              { entity_type: audit.entityType },
              { $or: [{ old_id: rowFilter }, { new_id: rowFilter }] },
            ],
          }}
          selectedColumns={selectedColumns}
          allowEdit={false}
          hideFilters={true}
          realtime={{ throttle: 200 }}
          onClosePopup={() => setShowHistory(false)}
        />
      )}
    </>
  );
};
