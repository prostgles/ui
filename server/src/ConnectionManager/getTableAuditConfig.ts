import type { ClientTableAuditConfig } from "@common/managedTableSchema";
import type { SchemaConfigAudit, TableConfig } from "prostgles-server";
import { getAuditWriterName } from "prostgles-server/dist/Audit/getAuditTableConfig";
import type { DBSchemaTable } from "prostgles-types";

/** Publish UI metadata only for tables with a server-generated audit writer. */
export const getTableAuditConfig = (
  table: DBSchemaTable,
  tableConfig: TableConfig[string] | undefined,
  audit: SchemaConfigAudit | undefined,
): ClientTableAuditConfig | undefined => {
  if (
    !audit ||
    !tableConfig?.triggers?.[getAuditWriterName(audit.tableName, table.name)]
  )
    return;
  const rule = audit.tables?.[table.name];
  const options = typeof rule === "object" ? rule : undefined;
  const idColumns = [
    ...(options?.idColumns ??
      table.columns.filter((c) => c.is_pkey).map((c) => c.name)),
  ];
  if (
    !idColumns.length ||
    idColumns.some(
      (name) => !table.columns.some((c) => c.name === name && c.select),
    )
  ) {
    return { error: "Insufficient privileges" };
  }
  return {
    tableName: audit.tableName,
    entityType: options?.entityType ?? table.name,
    idColumns,
  };
};
