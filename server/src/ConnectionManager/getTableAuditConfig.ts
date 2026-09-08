import type { ClientTableAuditConfig } from "@common/managedTableSchema";
import type { ResolvedAuditConfig } from "prostgles-server";
import type { DBSchemaTable } from "prostgles-types";

/** Publish UI metadata for tables included by the server's audit rules. */
export const getTableAuditConfig = (
  table: DBSchemaTable,
  auditConfig: ResolvedAuditConfig | undefined,
): ClientTableAuditConfig | undefined => {
  const config = auditConfig?.tables[table.name];
  if (!config) {
    return;
  }

  const { idColumns } = config;
  if (
    !idColumns.length ||
    idColumns.some(
      (name) => !table.columns.some((c) => c.name === name && c.select),
    )
  ) {
    return { error: "Insufficient privileges" };
  }
  return {
    tableName: auditConfig.tableName,
    idColumns,
  };
};
