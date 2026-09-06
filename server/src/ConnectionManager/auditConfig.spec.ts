import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pgPromise from "pg-promise";
import prostgles, { type DB, type TableConfig } from "prostgles-server";
import { addAuditTableConfig } from "./auditConfig";

const databaseUrl = process.env.PROSTGLES_AUDIT_TEST_DATABASE_URL;

void test(
  "PostgreSQL audit triggers capture transactional row changes",
  {
    skip:
      !databaseUrl &&
      "Set PROSTGLES_AUDIT_TEST_DATABASE_URL to run the database integration test",
  },
  async (t) => {
    const pgp = pgPromise();
    const admin = pgp(databaseUrl!);
    const database = `audit_test_${randomUUID().replaceAll("-", "")}`;
    const url = new URL(databaseUrl!);
    url.pathname = `/${database}`;
    await admin.none(`CREATE DATABASE ${pgp.as.name(database)}`);
    let destroy: (() => Promise<boolean>) | undefined;
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
        audit_events: { columns: { tenant_id: "text" } },
      };
      const tableConfig = addAuditTableConfig(
        {
          tableName: "audit_events",
          excludeColumns: ["secret"],
          tables: {
            records: 1,
            children: 1,
            custom_records: {
              idColumns: ["key"],
              entityType: "custom ' entity",
            },
          },
        },
        source,
        Object.keys(source),
      );
      let raw: DB | undefined;
      const instance = await prostgles({
        dbConnection: url.toString(),
        tableConfig,
        watchSchema: false,
        onReady: ({ db }) => {
          raw = db;
        },
      });
      destroy = instance.destroy;
      assert.ok(raw);
      const db = raw;

      await t.test(
        "creates storage and captures raw SQL with the request actor and scope",
        async () => {
          await db.tx(async (tx) => {
            await tx.none(
              `SET LOCAL "prostgles.user" = '{"id":"user-1","type":"default"}'`,
            );
            await tx.none(
              "INSERT INTO records VALUES ('tenant-1', 1, 'Before', 'hidden'), ('tenant-1', 2, 'Second', 'hidden')",
            );
          });
          const events = await db.any(
            "SELECT * FROM audit_events ORDER BY row_filter",
          );
          assert.equal(events.length, 2);
          assert.equal(events[0].actor_id, "user-1");
          assert.equal(events[0].tenant_id, "tenant-1");
          assert.deepEqual(events[0].row_filter, {
            tenant_id: "tenant-1",
            id: 1,
          });
          assert.deepEqual(events[0].summary, {
            after: { tenant_id: "tenant-1", id: 1, name: "Before" },
          });
          assert.ok(events[0].id);
          assert.ok(events[0].created_at);
        },
      );

      await t.test(
        "captures exact old/new values, including primary key changes",
        async () => {
          await db.none(
            "UPDATE records SET id = id + 10, name = name || ' changed'",
          );
          const events = await db.any(
            "SELECT * FROM audit_events WHERE action = 'update' ORDER BY row_filter",
          );
          assert.equal(events.length, 2);
          assert.deepEqual(events[0].summary, {
            changes: {
              id: { before: 1, after: 11 },
              name: { before: "Before", after: "Before changed" },
            },
          });
          assert.deepEqual(events[1].summary.changes.id, {
            before: 2,
            after: 12,
          });
          assert.equal(events[0].actor_id, null);
        },
      );

      await t.test("skips no-op and excluded-only updates", async () => {
        await db.none("UPDATE records SET secret = 'different', name = name");
        assert.equal(
          +(await db.one("SELECT count(*) FROM audit_events")).count,
          4,
        );
      });

      await t.test("rolls back audit events with their mutations", async () => {
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

      await t.test(
        "supports custom identifiers and quoted values",
        async () => {
          await db.none(
            `INSERT INTO "custom_records" VALUES ('custom-key', 'value')`,
          );
          const event = await db.one(
            "SELECT * FROM audit_events WHERE entity_type = $1",
            ["custom ' entity"],
          );
          assert.deepEqual(event.row_filter, { key: "custom-key" });
        },
      );

      await t.test("captures direct and cascading deletes", async () => {
        await db.none("INSERT INTO children VALUES (1, 'tenant-1', 11)");
        await db.none("DELETE FROM records WHERE id = 11");
        const events = await db.any(
          "SELECT * FROM audit_events WHERE action = 'delete' ORDER BY entity_type",
        );
        assert.equal(events.length, 2);
        assert.equal(events[0].entity_type, "children");
        assert.deepEqual(events[1].summary.before, {
          tenant_id: "tenant-1",
          id: 11,
          name: "Before changed",
        });
      });

      await t.test(
        "uses the committed predecessor after a concurrent update",
        async () => {
          let release!: () => void;
          let locked!: () => void;
          const gate = new Promise<void>((resolve) => {
            release = resolve;
          });
          const ready = new Promise<void>((resolve) => {
            locked = resolve;
          });
          const first = db.tx(async (tx) => {
            await tx.none(
              "UPDATE records SET name = 'First writer' WHERE id = 12",
            );
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
            "SELECT summary FROM audit_events WHERE summary #>> '{changes,name,after}' = 'Second writer'",
          );
          assert.deepEqual(event.summary.changes.name, {
            before: "First writer",
            after: "Second writer",
          });
        },
      );

      await t.test(
        "reloads audit options and removes disabled audit triggers",
        async () => {
          const nextConfig = addAuditTableConfig(
            {
              tableName: "audit_events",
              tables: { records: { excludeColumns: ["secret", "name"] } },
            },
            source,
            Object.keys(source),
          );
          await instance.update({ tableConfig: nextConfig });
          const before = +(await db.one("SELECT count(*) FROM audit_events"))
            .count;
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
          await instance.update({
            tableConfig: addAuditTableConfig(
              {
                tableName: "audit_events",
                tables: Object.fromEntries(
                  Object.keys(source).map((name) => [name, 0 as const]),
                ),
              },
              source,
              Object.keys(source),
            ),
          });
          await db.none(
            "UPDATE records SET secret = 'Audit disabled' WHERE id = 12",
          );
          assert.equal(
            +(await db.one("SELECT count(*) FROM audit_events")).count,
            before,
          );
          await instance.update({ tableConfig });
        },
      );

      await t.test(
        "excludes tables and protects audit rows against update/delete",
        async () => {
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
            db.none("UPDATE audit_events SET action = 'forged'"),
            /append-only/,
          );
          await assert.rejects(
            db.none("DELETE FROM audit_events"),
            /append-only/,
          );
        },
      );
    } finally {
      await destroy?.();
      await admin.none(`DROP DATABASE ${pgp.as.name(database)} WITH (FORCE)`);
      pgp.end();
    }
  },
);
