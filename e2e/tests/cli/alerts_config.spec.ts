import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { expect, test } from "../utils/fixtures";
import { createConfigTestProject } from "../utils/createConfigTestProject";

test("CLI managed alerts scope recipients, retry deliveries and retain edited rules", async () => {
  const configPath = createConfigTestProject(
    {
      id: "alerts-config-e2e",
      tableConfig: {
        reminders: {
          info: { label: "Custom reminders" },
          columns: { edited: "boolean DEFAULT false" },
          triggers: {
            mark_edited: {
              type: "before",
              actions: ["update"],
              forEach: "row",
              query: "BEGIN NEW.edited := true; RETURN NEW; END;",
            },
          },
        },
        reminders_recipients: {
          columns: { label: "text DEFAULT 'recipient'" },
          constraints: ["CHECK (length(label) > 0)"],
          indexes: { recipient_label: { columns: "label" } },
        },
        reminders_deliveries: {
          publish: {},
        },
        records: {
          columns: {
            id: "serial PRIMARY KEY",
            owner: "text NOT NULL",
            title: "text NOT NULL",
          },
        },
        sent: {
          columns: {
            id: "uuid PRIMARY KEY",
            recipient: "text NOT NULL",
            body: "text NOT NULL",
            attempts: "integer NOT NULL",
          },
        },
        gate: {
          columns: {
            id: "integer PRIMARY KEY",
            started: "boolean DEFAULT false",
            released: "boolean DEFAULT false",
          },
        },
      },
      accessControl: [
        {
          userTypes: ["default"],
          dbPermissions: {
            type: "Custom",
            customTables: [
              {
                tableName: "records",
                select: {
                  fields: "*",
                  forcedFilterDetailed: {
                    $and: [
                      {
                        type: "=",
                        fieldName: "owner",
                        contextValue: {
                          objectName: "user",
                          objectPropertyName: "id",
                        },
                      },
                    ],
                  },
                },
              },
              {
                tableName: "reminders_deliveries",
                select: true,
              },
            ],
          },
        },
      ],
    },
    test.info().outputPath("config"),
  );
  const configFile = join(configPath, "index.js");
  writeFileSync(
    configFile,
    readFileSync(configFile, "utf8") +
      `
let appDb;
module.exports.onMount = ({ dbo }) => { appDb = dbo; };
module.exports.jobs = { tableName: "background_jobs", definitions: {} };
module.exports.alerts = {
  tableName: "reminders",
  types: {
    outstanding: {
      params: { prefix: "string" },
      prepare: async ({ clientDb, params, localDate, signal }) => {
        if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(localDate)) throw new Error("Invalid local date");
        const rows = await clientDb.records.find({}, { select: ["title"] });
        if (params.prefix === "pause") {
          await appDb.gate.update({ id: 1 }, { started: true });
          while (!(await appDb.gate.findOne({ id: 1 })).released) {
            signal.throwIfAborted();
            await new Promise(resolve => setTimeout(resolve, 20));
          }
        }
        return rows.length ? { title: params.prefix, body: rows.map(row => row.title).join(",") } : null;
      },
    },
  },
  channels: {
    test: {
      send: async ({ recipientId, message, idempotencyKey }) => {
        const previous = await appDb.sent.findOne({ id: idempotencyKey });
        await appDb.sent.upsert({ id: idempotencyKey }, {
          recipient: recipientId, body: message.body, attempts: (previous?.attempts ?? 0) + 1,
        });
        if (!previous) throw new Error("Temporary transport failure");
        return { providerId: idempotencyKey };
      },
    },
  },
};
`,
  );
  const deployment = await createTestDeployment({
    configId: "alerts-config-e2e",
    configPath,
    logPath: test.info().outputPath("alerts-server.log"),
    users: [
      { key: "admin", type: "admin" },
      { key: "alice", type: "default" },
      { key: "bob", type: "default" },
      { key: "outsider", type: "default" },
    ],
  });
  try {
    const admin = await deployment.connectProjectAs("admin");
    const alice = await deployment.connectProjectAs("alice");
    const bob = await deployment.connectProjectAs("bob");
    const outsider = await deployment.connectProjectAs("outsider");
    const dbo = admin.db;
    expect(dbo.prostgles_jobs).toBeUndefined();
    expect(
      admin.tableSchema
        ?.find((table) => table.name === "reminders_deliveries")
        ?.columns.find((column) => column.name === "job_id")?.references,
    ).toContainEqual(
      expect.objectContaining({ ftable: "background_jobs", fcols: ["id"] }),
    );
    expect(
      admin.tableSchema?.find((table) => table.name === "reminders"),
    ).toMatchObject({ label: "Custom reminders" });
    expect(
      await admin.sql!(
        "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('recipient_label', 'reminders_deliveries_job') ORDER BY indexname",
        {},
        { returnType: "rows" },
      ),
    ).toEqual([
      { indexname: "recipient_label" },
      { indexname: "reminders_deliveries_job" },
    ]);
    for (const client of [admin, alice]) {
      expect(client.db.reminders_deliveries!.insert).toBeUndefined();
      expect(client.db.reminders_deliveries!.update).toBeUndefined();
      expect(client.db.reminders_deliveries!.delete).toBeUndefined();
    }
    await dbo.records!.insertMany!([
      { owner: alice.auth.user!.id, title: "Alice's evidence" },
      { owner: bob.auth.user!.id, title: "Bob's evidence" },
    ]);
    const rule = {
      name: "Weekly risks",
      created_by: admin.auth.user!.id,
      enabled: false,
      definition: { type: "outstanding", params: { prefix: "Outstanding" } },
      // Exercise overlapping occurrences while deliveries retry.
      schedule: { cron: "* * * * * *", timezone: "Europe/London" },
    };
    await expect(
      dbo.reminders!.insert!({
        ...rule,
        schedule: { ...rule.schedule, cron: "invalid" },
      }),
    ).rejects.toBeTruthy();
    await expect(
      dbo.reminders!.insert!({
        ...rule,
        schedule: { ...rule.schedule, timezone: "invalid" },
      }),
    ).rejects.toBeTruthy();
    await expect(
      dbo.reminders!.insert!({
        ...rule,
        definition: { type: "unknown", params: {} },
      }),
    ).rejects.toBeTruthy();
    await expect(
      dbo.reminders!.insert!({
        ...rule,
        definition: { type: "outstanding", params: { prefix: 10 } },
      }),
    ).rejects.toBeTruthy();
    const alert = await dbo.reminders!.insert!(rule, { returning: "*" });
    await dbo.reminders_recipients!.insertMany!(
      [alice, bob, outsider].map((client) => ({
        alert_id: String(alert.id),
        user_id: client.auth.user!.id,
        channel: "test",
      })),
    );
    await expect(
      dbo.reminders_recipients!.insert!({
        alert_id: String(alert.id),
        user_id: alice.auth.user!.id,
        channel: "test",
      }),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      dbo.reminders_recipients!.update!({ alert_id: alert.id }, { label: "" }),
    ).rejects.toMatchObject({ code: "23514" });
    await dbo.reminders!.update!({ id: alert.id }, { enabled: true });
    await expect
      .poll(() => dbo.reminders_deliveries!.count!({ alert_id: alert.id }))
      .toBeGreaterThan(0);
    const firstDelivery = await dbo.reminders_deliveries!.findOne!(
      { alert_id: alert.id },
      { orderBy: { occurrence: 1 } },
    );
    const deliveryFilter = {
      alert_id: alert.id,
      occurrence: firstDelivery!.occurrence,
    };
    await expect
      .poll(
        () =>
          dbo.reminders_deliveries!.count!({
            ...deliveryFilter,
            outcome: "sent",
          }),
        { timeout: 20_000 },
      )
      .toBe(2);
    await expect
      .poll(() =>
        dbo.reminders_deliveries!.count!({
          ...deliveryFilter,
          outcome: "skipped",
        }),
      )
      .toBe(1);
    await dbo.reminders!.update!({ id: alert.id }, { enabled: false });
    const deliveries = await dbo.reminders_deliveries!.find!(deliveryFilter);
    expect(
      await dbo.sent!.find!(
        { id: { $in: deliveries.map((delivery) => delivery.id) } },
        { select: ["body", "attempts"], orderBy: { body: 1 } },
      ),
    ).toEqual([
      { body: "Alice's evidence", attempts: 2 },
      { body: "Bob's evidence", attempts: 2 },
    ]);
    expect(
      new Set(
        deliveries.map((row) =>
          [row.alert_id, row.recipient_id, row.occurrence].join(":"),
        ),
      ).size,
    ).toBe(deliveries.length);
    expect(
      deliveries
        .filter((row) => row.outcome === "sent")
        .every((row) => row.provider_id === row.id && row.job_id),
    ).toBe(true);

    await dbo.gate!.insert!({ id: 1 });
    const pending = await dbo.reminders!.insert!(
      {
        ...rule,
        definition: { type: "outstanding", params: { prefix: "pause" } },
      },
      { returning: "*" },
    );
    await dbo.reminders_recipients!.insert!({
      alert_id: String(pending.id),
      user_id: bob.auth.user!.id,
      channel: "test",
    });
    await dbo.reminders!.update!({ id: pending.id }, { enabled: true });
    await expect
      .poll(
        async () => (await dbo.gate!.findOne!({ id: 1 }))?.started === true,
        { timeout: 15_000 },
      )
      .toBe(true);
    await dbo.reminders!.update!(
      { id: pending.id },
      { enabled: false, name: "Edited during preparation" },
    );
    const pendingDeliveries = await dbo.reminders_deliveries!.find!({
      alert_id: pending.id,
    });
    expect(pendingDeliveries.length).toBeGreaterThan(0);
    const pendingDeliveryFilter = {
      id: { $in: pendingDeliveries.map((delivery) => delivery.id) },
    };
    await dbo.gate!.update!({ id: 1 }, { released: true });
    await expect
      .poll(() =>
        dbo.reminders_deliveries!.count!({
          ...pendingDeliveryFilter,
          outcome: "skipped",
        }),
      )
      .toBe(pendingDeliveries.length);
    expect(await dbo.sent!.count!(pendingDeliveryFilter)).toBe(0);

    const { project: reconnected } = await deployment.syncSchema();
    expect(
      await reconnected.db.reminders!.findOne!({ id: pending.id }),
    ).toMatchObject({
      enabled: false,
      name: "Edited during preparation",
      revision: 3,
      edited: true,
    });
    expect(reconnected.db.reminders_deliveries!.insert).toBeUndefined();
  } finally {
    await deployment.dispose();
  }
});
