import type { ClientTableAuditConfig } from "@common/managedTableSchema";
import type { DBSchemaTable } from "prostgles-types";
import type { SchemaConfigAudit } from "../schemaConfig";
import { getAuditTableOptions } from "./auditConfig";

export const getTableAuditConfig = (
  table: DBSchemaTable,
  audit: SchemaConfigAudit | undefined,
): ClientTableAuditConfig | undefined => {
  if (!audit) return;
  const tableOptions = getAuditTableOptions(audit, table.name);
  if (!tableOptions) return;

  const primaryKeys = table.columns.filter((column) => column.is_pkey);
  const idColumns = [
    ...(tableOptions.idColumns ?? primaryKeys.map((column) => column.name)),
  ];
  if (
    !idColumns.length ||
    idColumns.some(
      (idColumn) => !table.columns.some((column) => column.name === idColumn),
    )
  ) {
    throw new Error(
      `Table ${table.name} is missing primary key columns for audit: ${idColumns.join(
        ", ",
      )}`,
    );
  }

  return {
    idColumns,
    entityType: tableOptions.entityType,
    tableName: audit.tableName,
  };
};
