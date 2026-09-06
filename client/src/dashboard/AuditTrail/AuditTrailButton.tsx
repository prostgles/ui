import Btn from "@components/Btn";
import { mdiHistory } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useState } from "react";
import { AUDIT_COLUMNS } from "@common/managedTableSchema";
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
  const audit = table.audit;
  const rowFilter =
    !audit || !row ?
      undefined
    : Object.fromEntries(
        audit.idColumns.map((column) => [column, row[column]]),
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
  const requiredColumns = audit && [
    AUDIT_COLUMNS.entityType,
    AUDIT_COLUMNS.rowFilter,
  ];

  if (
    !audit ||
    !rowFilter ||
    Object.values(rowFilter).some(
      (value) => value === undefined || value === null,
    ) ||
    !auditHandler?.find ||
    !requiredColumns?.every((column) => auditColumnNames.has(column))
  ) {
    return null;
  }

  const selectedColumns = [
    AUDIT_COLUMNS.createdAt,
    AUDIT_COLUMNS.actorId,
    AUDIT_COLUMNS.action,
    AUDIT_COLUMNS.details,
  ].filter((column) => auditColumnNames.has(column));

  return (
    <>
      <Btn
        data-command="AuditTrail.open"
        iconPath={mdiHistory}
        title="View audit history"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setShowHistory(true);
        }}
      />
      {showHistory && (
        <SmartTable
          db={db}
          sql={sql}
          tables={tables}
          methods={methods}
          tableName={audit.tableName}
          title={`History · ${table.label}`}
          filter={[
            { fieldName: AUDIT_COLUMNS.entityType, value: audit.entityType },
            { fieldName: AUDIT_COLUMNS.rowFilter, value: rowFilter },
          ]}
          selectedColumns={selectedColumns}
          initialSort={
            auditColumnNames.has(AUDIT_COLUMNS.createdAt) ?
              [{ key: AUDIT_COLUMNS.createdAt, asc: false, nulls: "last" }]
            : undefined
          }
          allowEdit={false}
          hideFilters={true}
          realtime={{ throttle: 200 }}
          onClosePopup={() => setShowHistory(false)}
        />
      )}
    </>
  );
};
