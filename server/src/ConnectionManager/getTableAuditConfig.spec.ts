import assert from "node:assert/strict";
import test from "node:test";
import type { DBSchemaTable } from "prostgles-types";
import type { SchemaConfigAudit } from "../schemaConfig";
import { addAuditTableConfig } from "./auditConfig";
import { getTableAuditConfig } from "./getTableAuditConfig";

const table = {
  name: "conditions",
  columns: [{ name: "id", is_pkey: true }, { name: "wording" }],
} as DBSchemaTable;

void test("audit config uses conventions and the row primary key", () => {
  assert.deepEqual(getTableAuditConfig(table, { tableName: "audit_events" }), {
    tableName: "audit_events",
    idColumns: ["id"],
    entityType: "conditions",
  });
});

void test("audit config supports table-specific identifiers", () => {
  assert.deepEqual(
    getTableAuditConfig(
      {
        ...table,
        name: "project_members",
        columns: [{ name: "project_id" }, { name: "user_id" }],
      } as DBSchemaTable,
      {
        tableName: "audit_events",
        tables: {
          project_members: {
            idColumns: ["project_id", "user_id"],
            entityType: "membership",
          },
        },
      },
    ),
    {
      tableName: "audit_events",
      idColumns: ["project_id", "user_id"],
      entityType: "membership",
    },
  );
});

void test("audit table is protected by an append-only database trigger", () => {
  const config = addAuditTableConfig(
    { tableName: "audit_events" },
    { audit_events: {} },
    [],
  );
  assert.deepEqual(
    config?.audit_events?.triggers?.prostglesAuditAppendOnly?.actions,
    ["update", "delete"],
  );
});

type AuditTypeTestSchema = {
  audit_events: { columns: { id: string } };
  myTable: { columns: { id: string; tenant_id: string } };
  otherTable: { columns: { id: string } };
};

const validIncludedAuditConfig: SchemaConfigAudit<AuditTypeTestSchema> = {
  tableName: "audit_events",
  tables: { myTable: { idColumns: ["tenant_id", "id"] } },
};
const validExcludedAuditConfig: SchemaConfigAudit<AuditTypeTestSchema> = {
  tableName: "audit_events",
  tables: { myTable: 0, otherTable: 0 },
};
const invalidMixedAuditConfig: SchemaConfigAudit<AuditTypeTestSchema> = {
  tableName: "audit_events",
  // @ts-expect-error Enabled and disabled audit table entries cannot be mixed.
  tables: { myTable: 1, otherTable: 0 },
};
const invalidIdColumnAuditConfig: SchemaConfigAudit<AuditTypeTestSchema> = {
  tableName: "audit_events",
  tables: {
    myTable: {
      // @ts-expect-error Audit identifiers must be columns of this table.
      idColumns: ["missing"],
    },
  },
};
void [
  validIncludedAuditConfig,
  validExcludedAuditConfig,
  invalidMixedAuditConfig,
  invalidIdColumnAuditConfig,
];

void test("audit config detects composite primary keys", () => {
  const config = getTableAuditConfig(
    {
      ...table,
      columns: [
        { name: "tenant_id", is_pkey: true },
        { name: "event_id", is_pkey: true },
      ],
    } as DBSchemaTable,
    { tableName: "audit_events" },
  );
  assert.deepEqual(config?.idColumns, ["tenant_id", "event_id"]);
});

void test("audit table rules support allowlists and exclusions", () => {
  assert.equal(
    getTableAuditConfig(table, {
      tableName: "audit_events",
      tables: { users: 1 },
    }),
    undefined,
  );
  assert.ok(
    getTableAuditConfig(table, {
      tableName: "audit_events",
      tables: { logs: 0, sessions: 0 },
    }),
  );
});

void test("audit config omits the log and rejects rows without identifiers", () => {
  assert.equal(
    getTableAuditConfig(
      { ...table, name: "audit_events" },
      { tableName: "audit_events" },
    ),
    undefined,
  );
  assert.throws(
    () =>
      getTableAuditConfig(
        { ...table, columns: [{ name: "value" }] } as DBSchemaTable,
        { tableName: "audit_events" },
      ),
    /missing primary key columns/,
  );
});
