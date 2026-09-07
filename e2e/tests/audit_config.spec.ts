import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pgPromise from "../../server/node_modules/pg-promise";
import type { TableConfig } from "../../server/node_modules/prostgles-server";
import type {
  SchemaConfig,
  SchemaConfigAudit,
} from "../../server/dist/server/src/schemaConfig";
import {
  createTestDeployment,
  type TestDeployment,
} from "../../server/dist/server/src/cli/testing";
import { test, expect } from "./fixtures";
import { createConfigTestProject } from "./utils/createConfigTestProject";

test("PostgreSQL audit triggers capture transactional row changes", async () => {
  test.setTimeout(180_000);
  const pgp = pgPromise();
  let deployment: TestDeployment | undefined;
  let configPath: string | undefined;
  let db!: ReturnType<typeof pgp>;
  let connectionId!: string;
  try {
    const source: TableConfig = {
      records: {
        columns: {
          tenant_id: "text NOT NULL",
          id: "integer NOT NULL",
          name: "text",
          secret: "text",
        },
        constraints: { records_pk: "PRIMARY KEY (tenant_id, id)" },
      },
      children: {
        columns: {
          id: "integer PRIMARY KEY",
          tenant_id: "text",
          record_id: "integer",
        },
        constraints: {
          parent:
            "FOREIGN KEY (tenant_id, record_id) REFERENCES records(tenant_id, id) ON DELETE CASCADE",
        },
      },
      custom_records: {
        columns: { key: "text UNIQUE NOT NULL", value: "text" },
      },
      ignored: { columns: { id: "integer PRIMARY KEY" } },
    };

    const config = {
      id: "audit-trigger-e2e",
      audit: {
        tableName: "audit_events",
        tables: {
          records: { excludeColumns: ["secret"] },
          children: 1,
          custom_records: { idColumns: ["key"], entityType: "custom ' entity" },
        },
      },
      tableConfig: source,
    } satisfies SchemaConfig;
    configPath = createConfigTestProject(config);
    deployment = await createTestDeployment({
      configPath,
      configId: config.id,
      logPath: test.info().outputPath("audit-server.log"),
      seed: async ({ projectDatabase, stateDatabase }) => {
        const { host, port, user, password, database } = projectDatabase;
        db = pgp({ host, port, user, password, database });
        const connection = await stateDatabase.query(
          "SELECT id FROM connections WHERE name = $1",
          [config.id],
        );
        connectionId = connection.rows[0].id;
      },
    });
    const state = await deployment.connectStateAs("admin");
    const reloadAudit = async (audit: SchemaConfigAudit) => {
      writeFileSync(
        join(configPath!, "index.js"),
        `module.exports = ${JSON.stringify({ ...config, audit })};`,
      );
      await state.methods!.syncSchema!({
        connectionId,
        configPath: configPath!,
      });
    };
    await test.step("creates storage and captures raw SQL with the request actor", async () => {
      await db.tx(async (tx) => {
        await tx.none(
          `SET LOCAL "prostgles.user" = '{"id":"user-1","type":"default"}'`,
        );
        await tx.none(
          "INSERT INTO records VALUES ('tenant-1', 1, 'Before', 'hidden'), ('tenant-1', 2, 'Second', 'hidden')",
        );
      });
      const events = await db.any("SELECT * FROM audit_events ORDER BY new_id");
      assert.equal(events.length, 2);
      assert.deepEqual(events[0].actor, { id: "user-1", type: "default" });
      assert.deepEqual(events[0].new_id, {
        tenant_id: "tenant-1",
        id: 1,
      });
      assert.deepEqual(events[0].new_row, {
        tenant_id: "tenant-1",
        id: 1,
        name: "Before",
      });
      assert.equal(events[0].old_row, null);
      assert.ok(events[0].id);
      assert.ok(events[0].created_at);
    });

    await test.step("captures exact old/new values, including primary key changes", async () => {
      await db.none(
        "UPDATE records SET id = id + 10, name = name || ' changed'",
      );
      const events = await db.any(
        "SELECT * FROM audit_events WHERE operation = 'UPDATE' ORDER BY new_id",
      );
      assert.equal(events.length, 2);
      assert.deepEqual(events[0].old_id, { tenant_id: "tenant-1", id: 1 });
      assert.deepEqual(events[0].new_id, { tenant_id: "tenant-1", id: 11 });
      assert.equal(events[0].old_row.name, "Before");
      assert.equal(events[0].new_row.name, "Before changed");
      assert.equal(events[1].old_id.id, 2);
      assert.equal(events[1].new_id.id, 12);
      assert.equal(events[0].actor, null);
    });

    await test.step("skips no-op and excluded-only updates", async () => {
      await db.none("UPDATE records SET secret = 'different', name = name");
      assert.equal(
        +(await db.one("SELECT count(*) FROM audit_events")).count,
        4,
      );
    });

    await test.step("rolls back audit events with their mutations", async () => {
      await assert.rejects(
        db.tx(async (tx) => {
          await tx.none(
            "INSERT INTO records VALUES ('tenant-1', 3, 'Rollback', 'secret')",
          );
          throw new Error("rollback");
        }),
        /rollback/,
      );
      assert.equal(
        +(await db.one("SELECT count(*) FROM audit_events")).count,
        4,
      );
    });

    await test.step("supports custom identifiers and quoted values", async () => {
      await db.none(
        `INSERT INTO "custom_records" VALUES ('custom-key', 'value')`,
      );
      const event = await db.one(
        "SELECT * FROM audit_events WHERE entity_type = $1",
        ["custom ' entity"],
      );
      assert.deepEqual(event.new_id, { key: "custom-key" });
    });

    await test.step("captures direct and cascading deletes", async () => {
      await db.none("INSERT INTO children VALUES (1, 'tenant-1', 11)");
      await db.none("DELETE FROM records WHERE id = 11");
      const events = await db.any(
        "SELECT * FROM audit_events WHERE operation = 'DELETE' ORDER BY entity_type",
      );
      assert.equal(events.length, 2);
      assert.equal(events[0].entity_type, "children");
      assert.deepEqual(events[1].old_row, {
        tenant_id: "tenant-1",
        id: 11,
        name: "Before changed",
      });
    });

    await test.step("uses the committed predecessor after a concurrent update", async () => {
      let release!: () => void;
      let locked!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const ready = new Promise<void>((resolve) => {
        locked = resolve;
      });
      const first = db.tx(async (tx) => {
        await tx.none("UPDATE records SET name = 'First writer' WHERE id = 12");
        locked();
        await gate;
      });
      await ready;
      const second = db.none(
        "UPDATE records SET name = 'Second writer' WHERE id = 12",
      );
      release();
      await Promise.all([first, second]);
      const event = await db.one(
        "SELECT old_row, new_row FROM audit_events WHERE new_row ->> 'name' = 'Second writer'",
      );
      assert.equal(event.old_row.name, "First writer");
      assert.equal(event.new_row.name, "Second writer");
    });

    await test.step("reloads audit options and removes disabled audit triggers", async () => {
      await reloadAudit({
        tableName: "audit_events",
        tables: { records: { excludeColumns: ["secret", "name"] } },
      });
      const before = +(await db.one("SELECT count(*) FROM audit_events")).count;
      await db.none(
        "UPDATE records SET name = 'Excluded after reload' WHERE id = 12",
      );
      await db.none(
        `INSERT INTO "custom_records" VALUES ('disabled-key', 'not audited')`,
      );
      assert.equal(
        +(await db.one("SELECT count(*) FROM audit_events")).count,
        before,
      );
      await reloadAudit({
        tableName: "audit_events",
        tables: Object.fromEntries(
          Object.keys(source).map((name) => [name, 0 as const]),
        ),
      });
      await db.none(
        "UPDATE records SET secret = 'Audit disabled' WHERE id = 12",
      );
      assert.equal(
        +(await db.one("SELECT count(*) FROM audit_events")).count,
        before,
      );
      await reloadAudit(config.audit);
    });

    await test.step("excludes tables and protects audit rows against update/delete", async () => {
      await db.none("INSERT INTO ignored VALUES (1)");
      assert.equal(
        +(
          await db.one(
            "SELECT count(*) FROM audit_events WHERE entity_type = 'ignored'",
          )
        ).count,
        0,
      );
      await assert.rejects(
        db.none("UPDATE audit_events SET operation = 'UPDATE'"),
        /Audit protection/,
      );
      await assert.rejects(
        db.none("DELETE FROM audit_events"),
        /Audit protection/,
      );
    });
  } finally {
    pgp.end();
    await deployment?.dispose();
    if (configPath) rmSync(configPath, { recursive: true, force: true });
  }
});

test("audits existing and configured tables without inferring names from audit rules", async () => {
  const config = {
    id: "audit-discovery-e2e",
    audit: { tableName: "audit_events" },
    onInitSQL: `
      CREATE TABLE IF NOT EXISTS existing_records (id integer PRIMARY KEY);
      CREATE VIEW existing_view AS SELECT * FROM existing_records;
    `,
    tableConfig: {
      configured_records: { columns: { id: "integer PRIMARY KEY" } },
    },
  } satisfies SchemaConfig;
  const configPath = createConfigTestProject(config);
  let deployment: TestDeployment | undefined;
  try {
    deployment = await createTestDeployment({
      configPath,
      configId: config.id,
      logPath: test.info().outputPath("audit-server.log"),
      seed: async ({ projectDatabase }) => {
        await projectDatabase.query(
          "INSERT INTO existing_records VALUES (1); INSERT INTO configured_records VALUES (2)",
        );
        const { rows } = await projectDatabase.query(
          "SELECT entity_type, new_id FROM audit_events ORDER BY entity_type",
        );
        expect(rows).toEqual([
          { entity_type: "configured_records", new_id: { id: 2 } },
          { entity_type: "existing_records", new_id: { id: 1 } },
        ]);
      },
    });
    const client = await deployment.connectProjectAs("admin");
    expect(
      client.tableSchema?.find((table) => table.name === "existing_records"),
    ).toHaveProperty("audit.tableName", "audit_events");
    expect(
      client.tableSchema?.find((table) => table.name === "existing_view"),
    ).not.toHaveProperty("audit.tableName");
  } finally {
    await deployment?.dispose();
    rmSync(configPath, { recursive: true, force: true });
  }
});
