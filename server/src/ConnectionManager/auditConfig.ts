import type { SchemaConfigAudit } from "../schemaConfig";
import { createHash } from "node:crypto";
import { as } from "pg-promise";
import { AUDIT_COLUMNS } from "@common/managedTableSchema";
import type { TableConfig } from "prostgles-server";

export type ResolvedAuditTableOptions = {
  entityType: string;
  idColumns?: readonly string[];
  excludeColumns: string[];
};

export const getAuditTableOptions = (
  audit: SchemaConfigAudit,
  tableName: string,
): ResolvedAuditTableOptions | undefined => {
  if (tableName === audit.tableName) return;
  const tableRules = Object.values(audit.tables ?? {});
  const isAllowList = tableRules.some((rule) => rule !== 0);
  const tableRule = audit.tables?.[tableName];
  if (tableRule === 0 || (isAllowList && tableRule === undefined)) return;

  const overrides = typeof tableRule === "object" ? tableRule : undefined;
  return {
    entityType: overrides?.entityType ?? tableName,
    idColumns: overrides?.idColumns,
    excludeColumns: [
      ...(audit.excludeColumns ?? []),
      ...(overrides?.excludeColumns ?? []),
    ],
  };
};

/** Function names are schema-wide and PostgreSQL identifiers are limited to 63 bytes. */
export const getAuditTriggerName = (tableName: string) =>
  `prostglesAudit_${createHash("sha256").update(tableName).digest("hex").slice(0, 20)}`;

export const addAuditTableConfig = (
  audit: SchemaConfigAudit | undefined,
  tableConfig: TableConfig | undefined,
  tableNames: string[],
): TableConfig | undefined => {
  if (!audit) return tableConfig;

  const existing = tableConfig?.[audit.tableName];
  if (existing && "isLookupTable" in existing) {
    throw new Error("The audit table cannot be a lookup table");
  }
  const result: TableConfig = {
    ...tableConfig,
    [audit.tableName]: {
      ...existing,
      columns: {
        id: "uuid PRIMARY KEY DEFAULT gen_random_uuid()",
        entity_type: "text NOT NULL",
        row_filter: "jsonb NOT NULL",
        action: "text NOT NULL",
        actor_id: "text",
        created_at: "timestamptz NOT NULL DEFAULT clock_timestamp()",
        summary: "jsonb NOT NULL",
        ...existing?.columns,
      },
      indexes: {
        [`${getAuditTriggerName(audit.tableName)}_row`]: {
          columns: "entity_type, row_filter, created_at DESC",
        },
        ...existing?.indexes,
      },
      triggers: {
        ...existing?.triggers,
        prostglesAuditAppendOnly: {
          type: "before",
          actions: ["update", "delete"],
          forEach: "row",
          query: `BEGIN RAISE EXCEPTION 'Audit table is append-only'; END;`,
        },
      },
    },
  };

  for (const tableName of new Set(tableNames)) {
    const options = getAuditTableOptions(audit, tableName);
    if (!options) continue;
    result[tableName] = {
      ...result[tableName],
      triggers: {
        ...result[tableName]?.triggers,
        [getAuditTriggerName(tableName)]: {
          type: "after",
          actions: ["insert", "update", "delete"],
          forEach: "row",
          query: getAuditTriggerQuery(audit.tableName, options),
        },
      },
    };
  }
  return result;
};

const getAuditTriggerQuery = (
  auditTableName: string,
  options: ResolvedAuditTableOptions,
) => {
  const auditTable = as.name(auditTableName);
  const excluded = as.array(options.excludeColumns) + "::text[]";
  return `
    DECLARE
      before_row jsonb;
      after_row jsonb;
      source_row jsonb;
      row_filter jsonb;
      id_columns text[];
      details jsonb;
      event jsonb;
      insert_columns text;
    BEGIN
      IF TG_OP <> 'INSERT' THEN before_row := to_jsonb(OLD) - ${excluded}; END IF;
      IF TG_OP <> 'DELETE' THEN after_row := to_jsonb(NEW) - ${excluded}; END IF;
      source_row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;

      IF TG_OP = 'UPDATE' THEN
        SELECT jsonb_object_agg(key, jsonb_build_object('before', before_row -> key, 'after', value))
        INTO details FROM jsonb_each(after_row)
        WHERE (before_row -> key) IS DISTINCT FROM value;
        IF details IS NULL THEN RETURN NULL; END IF;
        details := jsonb_build_object('changes', details);
      ELSIF TG_OP = 'INSERT' THEN
        details := jsonb_build_object('after', after_row);
      ELSE
        details := jsonb_build_object('before', before_row);
      END IF;

      ${
        options.idColumns ?
          `id_columns := ${as.array([...options.idColumns])}::text[];`
        : `
      SELECT array_agg(a.attname ORDER BY keys.ordinality) INTO id_columns
      FROM pg_index i
      CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS keys(attnum, ordinality)
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = keys.attnum
      WHERE i.indrelid = TG_RELID AND i.indisprimary AND keys.ordinality <= i.indnkeyatts;`
      }
      IF COALESCE(cardinality(id_columns), 0) = 0 OR NOT source_row ?& id_columns THEN
        RAISE EXCEPTION 'Audit requires primary key columns or valid idColumns for %', TG_TABLE_NAME;
      END IF;
      SELECT jsonb_object_agg(key, value) INTO row_filter
      FROM jsonb_each(source_row) WHERE key = ANY(id_columns);

      -- Preserve configured scope columns (e.g. project_id/discipline_id) for access rules.
      -- Omit unrelated columns so the audit table's defaults still apply.
      SELECT COALESCE(jsonb_object_agg(a.attname, source_row -> a.attname), '{}'::jsonb)
      INTO event FROM pg_attribute a
      WHERE a.attrelid = ${as.text(auditTable)}::regclass AND a.attnum > 0 AND NOT a.attisdropped
        AND a.attgenerated = '' AND a.attidentity = ''
        AND source_row ? a.attname AND NOT a.attname = ANY(${excluded})
        AND NOT a.attname = ANY(${as.array(Object.values(AUDIT_COLUMNS))}::text[])
        AND NOT EXISTS (
          SELECT 1 FROM pg_index i WHERE i.indrelid = a.attrelid
            AND i.indisprimary AND a.attnum = ANY(i.indkey)
        );
      event := event || jsonb_build_object(
        'entity_type', ${as.text(options.entityType)},
        'row_filter', row_filter,
        'action', lower(TG_OP),
        'actor_id', NULLIF(current_setting('prostgles.user', true), '')::jsonb ->> 'id',
        'created_at', clock_timestamp(),
        'summary', details
      );
      SELECT string_agg(quote_ident(key), ', ') INTO insert_columns FROM jsonb_object_keys(event) AS key;
      EXECUTE format('INSERT INTO %s (%s) SELECT %s FROM jsonb_populate_record(NULL::%s, $1)',
        ${as.text(auditTable)}, insert_columns, insert_columns, ${as.text(auditTable)}) USING event;
      RETURN NULL;
    END;
  `;
};
