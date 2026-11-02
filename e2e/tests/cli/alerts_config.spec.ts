import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { startMockSMTPServer } from "../mockSMTPServer";
import { expect, test } from "../utils/fixtures";
import { createConfigTestProject } from "../utils/createConfigTestProject";

test("CLI managed alerts resolve user filters, retry deliveries and retain shared rules", async () => {
  const configPath = createConfigTestProject(
    {
      id: "alerts-config-e2e",
      emailOutbox: {},
      connection: {
        table_options: {
          reminders: {
            columns: { definition: { label: "Rule details", width: 360 } },
          },
        },
      },
      tableConfig: {
        reminders: {
          info: { label: "Custom reminders" },
          columns: {
            edited: "boolean DEFAULT false",
            label: "text DEFAULT 'alert'",
          },
          constraints: ["CHECK (length(label) > 0)"],
          indexes: { reminder_label: { columns: "label" } },
          triggers: {
            mark_edited: {
              type: "before",
              actions: ["update"],
              forEach: "row",
              query: "BEGIN NEW.edited := true; RETURN NEW; END;",
            },
          },
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
              {
                tableName: "reminders",
                select: {
                  fields: "*",
                  forcedFilterDetailed: {
                    $and: [
                      {
                        type: "=",
                        fieldName: "created_by",
                        contextValue: {
                          objectName: "user",
                          objectPropertyName: "id",
                        },
                      },
                    ],
                  },
                },
                update: {
                  fields: ["name", "definition", "schedule", "enabled"],
                  forcedFilterDetailed: {
                    $and: [
                      {
                        type: "=",
                        fieldName: "created_by",
                        contextValue: {
                          objectName: "user",
                          objectPropertyName: "id",
                        },
                      },
                    ],
                  },
                },
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
const createReminder = (title, waitForRelease = false) => ({
  name: title, enabled: false,
  schedule: { cron: "0 9 * * 1", timezone: "Europe/London" },
  userFilter: { id: { $in: [] } }, channels: ["test"],
  prepare: async ({ clientDb, localDate, signal }) => {
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(localDate)) throw new Error("Invalid local date");
    const rows = await clientDb.records.find({}, { select: ["title"] });
    if (waitForRelease) {
      await appDb.gate.update({ id: 1 }, { started: true });
      while (!(await appDb.gate.findOne({ id: 1 })).released) {
        signal.throwIfAborted();
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
    return rows.length ? { title, body: rows.map(row => row.title).join(",") } : null;
  },
});
module.exports.alerts = {
  tableName: "reminders",
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
  rules: {
    personal: {
      ...createReminder("Default"), name: "My configured reminder",
      userFilter: { username: { $in: ["alice", "later", "disabled"] } },
    },
    outstanding: createReminder("Outstanding"),
    pending: createReminder("Paused", true),
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
    expect(admin.methodSchema!.previewAlert!.input).toMatchObject({
      alertId: { type: "ValueLookup", table: "reminders", column: "id" },
    });
    expect(admin.methodSchema!.previewAlert!.input).not.toHaveProperty(
      "recipientId",
    );
    expect(admin.methodSchema!.sendTestAlert!.input).toMatchObject({
      channel: {
        type: "ValueLookup",
        table: "reminders_channels",
        column: "id",
      },
    });
    expect(await dbo.reminders_channels!.find!()).toEqual([{ id: "test" }]);
    expect(
      admin.tableSchema
        ?.find((table) => table.name === "reminders")
        ?.columns.find((column) => column.name === "channels")?.jsonbSchema,
    ).toMatchObject({
      type: "ValueLookup[]",
      table: "reminders_channels",
      column: "id",
    });
    /* Each configured rule is stored once, independently of matching users. */
    await expect
      .poll(() => dbo.reminders!.count!({ config_key: "personal" }))
      .toBe(1);
    const configuredAlert = await dbo.reminders!.findOne!({
      config_key: "personal",
    });
    expect(configuredAlert).toMatchObject({
      name: "My configured reminder",
      created_by: null,
      user_filter: { username: { $in: ["alice", "later", "disabled"] } },
      channels: ["test"],
      enabled: false,
      definition: null,
    });
    expect(await bob.db.reminders!.count!({ config_key: "personal" })).toBe(0);
    await dbo.reminders!.update!(
      { id: configuredAlert!.id },
      {
        name: "My edited reminder",
        schedule: { cron: "0 10 * * 2", timezone: "UTC" },
      },
    );
    expect(await dbo.reminders!.count!({})).toBe(3);
    expect(dbo.reminders_recipients).toBeUndefined();
    /* Without user sync, alert user IDs remain UUIDs without foreign keys. */
    expect(dbo.users).toBeUndefined();
    for (const [tableName, columnName] of [
      ["reminders", "created_by"],
      ["reminders_deliveries", "user_id"],
      ["email_outbox", "user_id"],
    ]) {
      const column = admin.tableSchema
        ?.find((table) => table.name === tableName)
        ?.columns.find((column) => column.name === columnName);
      expect(column?.udt_name).toBe("uuid");
      expect(column?.references?.length ?? 0).toBe(0);
    }
    expect(dbo.prostgles_jobs).toBeUndefined();
    expect(
      admin.tableSchema
        ?.find((table) => table.name === "reminders_deliveries")
        ?.columns.find((column) => column.name === "job_id")?.references,
    ).toContainEqual(
      expect.objectContaining({ ftable: "background_jobs", fcols: ["id"] }),
    );
    /* Managed alert metadata merges custom labels with default columns/schema. */
    expect(
      admin.tableSchema?.find((table) => table.name === "reminders"),
    ).toMatchObject({
      label: "Custom reminders",
      managedTableType: "alerts",
      defaultColumns: [
        "name",
        "enabled",
        "user_filter",
        "channels",
        "definition",
        "schedule",
      ],
      referenceDisplay: { columns: [{ name: "name" }] },
      columnConfigs: { definition: { label: "Rule details", width: 360 } },
      columns: expect.arrayContaining([
        expect.objectContaining({
          name: "definition",
          label: "Rule details",
          jsonbSchema: expect.any(Object),
        }),
      ]),
    });
    expect(
      admin.tableSchema?.find((table) => table.name === "reminders_deliveries"),
    ).toMatchObject({
      sort: [{ key: "occurrence", asc: false }],
      columns: expect.arrayContaining([
        expect.objectContaining({
          name: "definition",
          jsonbSchema: expect.any(Object),
        }),
      ]),
    });
    /* Managed renderers survive column option overrides for each alert field. */
    for (const [tableName, fieldNames] of Object.entries({
      reminders: ["definition", "schedule", "user_filter", "channels"],
      reminders_deliveries: ["definition"],
    })) {
      for (const field of fieldNames) {
        expect(
          admin.tableSchema
            ?.find((table) => table.name === tableName)
            ?.columns.find((column) => column.name === field)?.defaultRenderAs,
        ).toEqual({
          type: "Internal",
          params: { component: "Alert", field },
        });
      }
    }
    expect(
      await admin.sql!(
        "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('reminder_label', 'reminders_deliveries_job') ORDER BY indexname",
        {},
        { returnType: "rows" },
      ),
    ).toEqual([
      { indexname: "reminder_label" },
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
      config_key: "outstanding",
      definition: null,
      user_filter: {
        id: {
          $in: [alice, bob, outsider].map((client) => client.auth.user!.id),
        },
      },
      channels: ["test"],
      /* Exercise overlapping occurrences while deliveries retry. */
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
    /* Callback alerts require a config key instead of a serialized definition. */
    await expect(
      dbo.reminders!.insert!({ ...rule, config_key: null }),
    ).rejects.toMatchObject({ code: "23514" });
    const [alert] =
      (await dbo.reminders!.update!({ config_key: "outstanding" }, rule, {
        returning: "*",
      })) ?? [];
    if (!alert) throw new Error("Configured alert was not seeded");
    await expect(dbo.reminders!.insert!(rule)).rejects.toMatchObject({
      code: "23505",
    });
    await expect(
      dbo.reminders!.update!({ id: alert.id }, { label: "" }),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      dbo.reminders!.update!({ id: alert.id }, { channels: [] }),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      dbo.reminders!.update!({ id: alert.id }, { channels: ["missing"] }),
    ).rejects.toBeTruthy();
    await test.step("Reject invalid recipient filters on insert and update", async () => {
      for (const invalidUserFilter of [
        { unknown_user_column: "alice" },
        { id: "invalid-uuid" },
      ]) {
        await expect(
          dbo.reminders!.insert!({
            ...rule,
            config_key: "invalid-recipient-filter",
            user_filter: invalidUserFilter,
          }),
        ).rejects.toBeTruthy();
        await expect(
          dbo.reminders!.update!(
            { id: alert.id },
            { user_filter: invalidUserFilter },
          ),
        ).rejects.toBeTruthy();
      }
      expect(await dbo.reminders!.findOne!({ id: alert.id })).toMatchObject({
        user_filter: rule.user_filter,
      });
    });
    /* A rule corrupted through SQL must not stop healthy rules from scheduling. */
    const invalidAlert = await dbo.reminders!.insert!(
      { ...rule, name: "Invalid recipients", config_key: "invalid-recipients" },
      { returning: "*" },
    );
    await admin.sql!(
      "UPDATE reminders SET enabled = true, user_filter = $2 WHERE id = $1",
      [invalidAlert.id, { id: "invalid-uuid" }],
    );
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
    await expect
      .poll(() =>
        dbo.background_jobs!.findOne!(
          { job_name: "__prostgles_alertSchedule", status: "failed" },
          { orderBy: { created_at: -1 } },
        ),
      )
      .toMatchObject({
        error: {
          message: "Failed to schedule one or more alerts",
          cause: expect.arrayContaining([
            { alertId: invalidAlert.id, error: expect.anything() },
          ]),
        },
      });
    expect(
      await dbo.reminders_deliveries!.count!({ alert_id: invalidAlert.id }),
    ).toBe(0);
    await dbo.reminders!.delete!({ id: invalidAlert.id });
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
          [row.alert_id, row.user_id, row.channel, row.occurrence].join(":"),
        ),
      ).size,
    ).toBe(deliveries.length);
    expect(
      deliveries
        .filter((row) => row.outcome === "sent")
        .every((row) => row.provider_id === row.id && row.job_id),
    ).toBe(true);

    await expect
      .poll(
        () =>
          dbo.reminders_deliveries!.count!({
            alert_id: alert.id,
            outcome: "pending",
          }),
        { timeout: 20_000 },
      )
      .toBe(0);
    await dbo.gate!.insert!({ id: 1 });
    const [pending] =
      (await dbo.reminders!.update!(
        { config_key: "pending" },
        {
          ...rule,
          config_key: "pending",
          user_filter: { id: bob.auth.user!.id },
          schedule: {
            cron: `${(new Date().getUTCSeconds() + 3) % 60} * * * * *`,
            timezone: "UTC",
          },
        },
        { returning: "*" },
      )) ?? [];
    if (!pending) throw new Error("Configured alert was not seeded");
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

    await test.step("Skip users who stop matching while delivery is being prepared", async () => {
      const state = await deployment.connectStateAs("admin");
      await dbo.gate!.update!({ id: 1 }, { started: false, released: false });
      await dbo.reminders!.update!(
        { id: pending.id },
        {
          enabled: true,
          user_filter: { username: "bob" },
          schedule: {
            cron: `${(new Date().getUTCSeconds() + 3) % 60} * * * * *`,
            timezone: "UTC",
          },
        },
      );
      await expect
        .poll(async () => (await dbo.gate!.findOne!({ id: 1 }))?.started, {
          timeout: 15_000,
        })
        .toBe(true);
      await state.db.users!.update(
        { id: bob.auth.user!.id },
        { username: "excluded" },
      );
      const preparedDeliveries = await dbo.reminders_deliveries!.find!({
        alert_id: pending.id,
        revision: 5,
      });
      expect(preparedDeliveries.length).toBeGreaterThan(0);
      const preparedFilter = {
        id: { $in: preparedDeliveries.map(({ id }) => id) },
      };
      await dbo.gate!.update!({ id: 1 }, { released: true });
      await expect
        .poll(() =>
          dbo.reminders_deliveries!.count!({
            ...preparedFilter,
            outcome: "skipped",
          }),
        )
        .toBe(preparedDeliveries.length);
      expect(await dbo.sent!.count!(preparedFilter)).toBe(0);
      await dbo.reminders!.update!({ id: pending.id }, { enabled: false });
      await state.db.users!.update(
        { id: bob.auth.user!.id },
        { username: "bob" },
      );
    });

    writeFileSync(
      configFile,
      readFileSync(configFile, "utf8") +
        '\nmodule.exports.alerts.rules.personal.name = "Updated CLI default";\n',
    );
    const { project: reconnected } = await deployment.syncSchema();
    /* Reloads preserve the shared rule and its edits. */
    expect(
      await reconnected.db.reminders!.findOne!({ id: configuredAlert!.id }),
    ).toMatchObject({
      name: "My edited reminder",
      revision: 2,
      enabled: false,
      definition: null,
      schedule: { cron: "0 10 * * 2", timezone: "UTC" },
    });
    expect(
      await reconnected.db.reminders!.count!({ config_key: "personal" }),
    ).toBe(1);
    /* Membership is evaluated at each occurrence without creating any alert copies. */
    const state = await deployment.connectStateAs("admin");
    await reconnected.db.reminders!.update!(
      { id: configuredAlert!.id },
      { enabled: true, schedule: { cron: "* * * * * *", timezone: "UTC" } },
    );
    await expect
      .poll(
        () =>
          reconnected.db.reminders_deliveries!.count!({
            alert_id: configuredAlert!.id,
            user_id: alice.auth.user!.id,
            outcome: "sent",
          }),
        { timeout: 20_000 },
      )
      .toBeGreaterThan(0);
    expect(
      await reconnected.db.reminders_deliveries!.count!({
        alert_id: configuredAlert!.id,
        user_id: outsider.auth.user!.id,
      }),
    ).toBe(0);
    await reconnected.db.records!.insert!({
      owner: outsider.auth.user!.id,
      title: "Later evidence",
    });
    await state.db.users!.update(
      { id: outsider.auth.user!.id },
      { username: "later" },
    );
    await state.db.users!.update(
      { id: bob.auth.user!.id },
      { username: "disabled", status: "disabled" },
    );
    await expect
      .poll(
        () =>
          reconnected.db.reminders_deliveries!.count!({
            alert_id: configuredAlert!.id,
            user_id: outsider.auth.user!.id,
            outcome: "sent",
          }),
        { timeout: 20_000 },
      )
      .toBeGreaterThan(0);
    expect(
      await reconnected.db.reminders_deliveries!.count!({
        alert_id: configuredAlert!.id,
        user_id: bob.auth.user!.id,
      }),
    ).toBe(0);
    await reconnected.db.reminders!.update!(
      { id: configuredAlert!.id },
      { enabled: false },
    );
    expect(await reconnected.db.reminders!.count!({})).toBe(3);
    expect(
      await reconnected.db.reminders!.count!({ config_key: "personal" }),
    ).toBe(1);
    expect(reconnected.db.reminders_recipients).toBeUndefined();
    expect(
      await reconnected.db.reminders!.findOne!({ id: pending.id }),
    ).toMatchObject({
      enabled: false,
      name: "Edited during preparation",
      revision: 6,
      edited: true,
    });
    expect(reconnected.db.reminders_deliveries!.insert).toBeUndefined();
  } finally {
    await deployment.dispose();
  }
});

test("CLI alert deduplication suppresses sent items, reserves retries and expires per recipient and channel", async () => {
  const configPath = createConfigTestProject(
    {
      id: "alert-deduplication-e2e",
      jobs: { tableName: "notification_jobs", definitions: {} },
      tableConfig: {
        records: {
          columns: {
            id: "integer PRIMARY KEY",
            title: "text NOT NULL",
            active: "boolean NOT NULL DEFAULT true",
          },
        },
        sent: {
          columns: {
            id: "uuid PRIMARY KEY",
            recipient: "uuid NOT NULL",
            channel: "text NOT NULL",
            body: "text NOT NULL",
            attempts: "integer NOT NULL",
            delivered: "boolean NOT NULL DEFAULT false",
          },
        },
        transport: {
          columns: {
            id: "boolean PRIMARY KEY DEFAULT true",
            fail: "boolean NOT NULL",
          },
        },
      },
      alerts: {
        rules: {
          reminders: {
            name: "Evidence reminders",
            enabled: false,
            schedule: { cron: "* * * * * *", timezone: "UTC" },
            userFilter: { type: "default" },
            channels: ["first", "second"],
            deduplicate: { key: ["id"], for: "24h" },
            query: {
              table: "records",
              filter: {
                $and: [{ fieldName: "active", type: "=", value: true }],
              },
              select: ["id", "title"],
              orderBy: { id: 1 },
            },
            template: {
              title: "Evidence reminders",
              body: "{{data.items}}",
              data: { items: { text: "{{title}}", separator: ", " } },
            },
          },
        },
        channels: {},
      },
      accessControl: [
        {
          userTypes: ["default"],
          dbPermissions: {
            type: "Custom",
            customTables: [{ tableName: "records", select: true }],
          },
        },
      ],
    },
    test.info().outputPath("deduplication-config"),
  );
  const configFile = join(configPath, "index.js");
  writeFileSync(
    configFile,
    readFileSync(configFile, "utf8") +
      `
module.exports.alerts.channels = Object.fromEntries(["first", "second"].map(channel => [channel, {
  send: async ({ dbo, recipientId, message, idempotencyKey }) => {
    const previous = await dbo.sent.findOne({ id: idempotencyKey });
    if (previous?.delivered) return { providerId: idempotencyKey };
    await dbo.sent.upsert({ id: idempotencyKey }, {
      recipient: recipientId, channel, body: message.body, attempts: (previous?.attempts ?? 0) + 1,
    });
    if (!previous || (await dbo.transport.findOne({ id: true }))?.fail) {
      throw new Error("Temporary transport failure");
    }
    await dbo.sent.update({ id: idempotencyKey }, { delivered: true });
    return { providerId: idempotencyKey };
  },
}]));
`,
  );
  const deployment = await createTestDeployment({
    configId: "alert-deduplication-e2e",
    configPath,
    logPath: test.info().outputPath("deduplication-server.log"),
    users: [
      { key: "admin", type: "admin" },
      { key: "alice", type: "default" },
      { key: "bob", type: "default" },
    ],
  });
  try {
    const admin = await deployment.connectProjectAs("admin");
    const { db } = admin;
    const alert = await db.alerts!.findOne!({ config_key: "reminders" });
    if (!alert) throw new Error("Configured alert was not seeded");
    expect(alert.definition.deduplicate).toEqual({ key: ["id"], for: "24h" });
    await db.records!.insertMany!([
      { id: 0, title: "First" },
      { id: 2, title: "Second" },
    ]);
    await db.transport!.insert!({ fail: false });
    const sentFilter = { alert_id: alert.id, outcome: "sent" };
    const expectSentCount = async (count: number) => {
      try {
        await expect
          .poll(() => db.alerts_deliveries!.count!(sentFilter), {
            timeout: 20_000,
          })
          .toBe(count);
      } catch (error) {
        await test.info().attach("alert-delivery-failures", {
          body: JSON.stringify(
            await db.notification_jobs!.find!(
              { status: "failed" },
              { select: ["job_name", "error"], limit: 5 },
            ),
          ),
          contentType: "application/json",
        });
        throw error;
      }
    };
    const expectSuppressed = async () => {
      const since = new Date().toISOString();
      await expect
        .poll(
          () =>
            db.alerts_deliveries!.count!({
              alert_id: alert.id,
              outcome: "skipped",
              created_at: { $gt: since },
            }),
          { timeout: 15_000 },
        )
        .toBeGreaterThanOrEqual(4);
    };
    const pause = async () => {
      await db.alerts!.update!({ id: alert.id }, { enabled: false });
      await expect
        .poll(
          () =>
            db.notification_jobs!.count!({
              status: { $in: ["pending", "running"] },
              job_name: "__prostgles_alertDelivery",
            }),
          { timeout: 20_000 },
        )
        .toBe(0);
    };

    await test.step("Reserve overlapping occurrences during retries, independently for both recipients and channels", async () => {
      await db.alerts!.update!({ id: alert.id }, { enabled: true });
      await expectSentCount(4);
      await expectSuppressed();
      const messages = await db.sent!.find!({ delivered: true });
      expect(messages).toHaveLength(4);
      expect(
        new Set(
          messages.map(({ recipient, channel }) => `${recipient}:${channel}`),
        ).size,
      ).toBe(4);
      expect(
        messages.every(
          ({ body, attempts }) => body === "First, Second" && attempts === 2,
        ),
      ).toBe(true);
      const deliveries = await db.alerts_deliveries!.find!(sentFilter);
      expect(
        deliveries.every(
          ({ deduplication_keys, sent_at }) =>
            deduplication_keys.length === 2 && sent_at,
        ),
      ).toBe(true);
      expect(
        new Set(
          deliveries.map(({ deduplication_keys }) =>
            JSON.stringify(deduplication_keys),
          ),
        ).size,
      ).toBe(1);
    });

    await test.step("Only new digest items notify; leaving and re-entering does not reset the cooldown", async () => {
      await db.records!.insert!({ id: 3, title: "Third" });
      await expectSentCount(8);
      expect(await db.sent!.count!({ delivered: true, body: "Third" })).toBe(4);
      await db.records!.update!({ id: 0 }, { active: false });
      await expectSuppressed();
      await db.records!.update!({ id: 0 }, { active: true });
      await expectSuppressed();
      expect(await db.alerts_deliveries!.count!(sentFilter)).toBe(8);
    });

    await test.step("Cooldown expires after successful delivery and is independent of rule identity", async () => {
      await pause();
      await admin.sql!(
        "UPDATE alerts_deliveries SET sent_at = now() - interval '25 hours' WHERE alert_id = $1 AND outcome = 'sent'",
        [alert.id],
      );
      await db.alerts!.update!({ id: alert.id }, { enabled: true });
      await expectSentCount(12);
      expect(
        await db.sent!.count!({
          delivered: true,
          body: "First, Second, Third",
        }),
      ).toBe(4);
      await pause();
      const independent = await db.alerts!.insert!(
        {
          name: "Independent reminders",
          enabled: true,
          schedule: alert.schedule,
          user_filter: alert.user_filter,
          channels: ["first"],
          definition: alert.definition,
        },
        { returning: "*" },
      );
      await expect
        .poll(
          () =>
            db.alerts_deliveries!.count!({
              alert_id: independent.id,
              outcome: "sent",
            }),
          { timeout: 20_000 },
        )
        .toBe(2);
      await db.alerts!.update!({ id: independent.id }, { enabled: false });
      await pause();
    });

    await test.step("Failed deliveries release their reservations without starting a cooldown", async () => {
      await db.records!.insert!({ id: 4, title: "Failed then recovered" });
      await db.transport!.update!({ id: true }, { fail: true });
      await db.alerts!.update!({ id: alert.id }, { enabled: true });
      await expect
        .poll(
          () =>
            db.notification_jobs!.count!({
              status: "failed",
              job_name: "__prostgles_alertDelivery",
            }),
          { timeout: 20_000 },
        )
        .toBeGreaterThan(0);
      await db.transport!.update!({ id: true }, { fail: false });
      await expectSentCount(16);
      await expectSuppressed();
      expect(
        await db.sent!.count!({
          delivered: true,
          body: "Failed then recovered",
        }),
      ).toBe(4);
      await pause();
    });

    await test.step("Validate saved deduplication settings and reject missing key columns at evaluation", async () => {
      for (const deduplicate of [
        { key: [], for: "24h" },
        { key: [" "], for: "24h" },
        { key: ["id", "id"], for: "24h" },
        ...["", "0h", "-1d", "1.5h", "24", "999999999999999999d"].map(
          (duration) => ({ key: ["id"], for: duration }),
        ),
      ]) {
        await expect(
          db.alerts!.update!(
            { id: alert.id },
            {
              definition: { ...alert.definition, deduplicate },
            },
          ),
        ).rejects.toBeTruthy();
      }
      const failedCount = await db.notification_jobs!.count!({
        status: "failed",
      });
      await db.alerts!.update!(
        { id: alert.id },
        {
          enabled: true,
          definition: {
            ...alert.definition,
            deduplicate: { key: ["missing"], for: "1h" },
          },
        },
      );
      await expect
        .poll(() => db.notification_jobs!.count!({ status: "failed" }), {
          timeout: 20_000,
        })
        .toBeGreaterThan(failedCount);
      const failedJob = await db.notification_jobs!.findOne!(
        { status: "failed" },
        { orderBy: { finished_at: -1 } },
      );
      expect(JSON.stringify(failedJob?.error)).toContain(
        "Alert deduplication key requires",
      );
      expect(await db.alerts_deliveries!.count!(sentFilter)).toBe(16);
      await pause();
    });

    await test.step("Use query-produced keys and preserve edited cooldowns on config reload", async () => {
      const definition = {
        ...alert.definition,
        query: {
          ...alert.definition.query,
          select: { title: 1, deduplicationKey: { $upper: ["title"] } },
        },
        deduplicate: { key: ["deduplicationKey"], for: "2d" },
      };
      await db.alerts!.update!({ id: alert.id }, { definition, enabled: true });
      await expectSentCount(20);
      await expectSuppressed();
      await pause();
      const { project } = await deployment.syncSchema();
      expect(
        (await project.db.alerts!.findOne!({ id: alert.id }))?.definition,
      ).toEqual(definition);
    });
  } finally {
    await deployment.dispose();
  }
});

test("CLI in-app alerts share the bell, isolate recipients and retain read state", async ({
  page,
}) => {
  const configPath = createConfigTestProject(
    {
      id: "in-app-alerts-e2e",
      databaseConfig: { sync_users: true },
      jobs: { tableName: "notification_jobs", definitions: {} },
      tableConfig: {
        users: {
          columns: {
            id: "UUID PRIMARY KEY",
            status: "TEXT NOT NULL",
            last_updated: "BIGINT NOT NULL",
          },
        },
        records: {
          columns: {
            id: "serial PRIMARY KEY",
            owner: "uuid NOT NULL",
            title: "text NOT NULL",
          },
        },
      },
      alerts: {
        tableName: "reminders",
        rules: {
          planning: {
            name: "Planning reminders",
            enabled: false,
            query: {
              table: "records",
              filter: { $and: [] },
              select: ["title"],
            },
            template: {
              title: "Planning reminder",
              body: "{{data.records}}",
              data: {
                records: {
                  text: "{{title}}",
                  separator: "\n",
                },
              },
            },
            schedule: { cron: "*/30 * * * * *", timezone: "Europe/London" },
            userFilter: { type: "default" },
            channels: ["inbox"],
          },
        },
        channels: { inbox: { type: "inApp" } },
      },
      accessControl: [
        {
          userTypes: ["default"],
          dbsPermissions: { createWorkspaces: true },
          dbPermissions: {
            type: "Custom",
            customTables: [
              ...["records", "reminders_deliveries"].map((tableName) => ({
                tableName,
                select: {
                  fields: "*" as const,
                  forcedFilterDetailed: {
                    $and: [
                      {
                        type: "=",
                        fieldName:
                          tableName === "records" ? "owner" : "user_id",
                        contextValue: {
                          objectName: "user",
                          objectPropertyName: "id",
                        },
                      },
                    ],
                  },
                },
              })),
            ],
          },
        },
      ],
    },
    test.info().outputPath("in-app-config"),
  );
  const configFile = join(configPath, "index.js");
  writeFileSync(
    configFile,
    readFileSync(configFile, "utf8") +
      `
let failDeliveryUpdate = true;
module.exports.tableHooks = {
  reminders_deliveries: { beforeEach: [{ commands: { update: 1 }, validate: ({ data }) => {
    if (data.outcome === "sent" && failDeliveryUpdate) {
      failDeliveryUpdate = false;
      throw new Error("Simulate a failure recording in-app delivery success");
    }
  } }] },
};
`,
  );
  const deployment = await createTestDeployment({
    configId: "in-app-alerts-e2e",
    configPath,
    logPath: test.info().outputPath("in-app-server.log"),
    users: [
      { key: "admin", type: "admin" },
      { key: "alice", type: "default" },
      { key: "bob", type: "default" },
    ],
  });
  try {
    const admin = await deployment.connectProjectAs("admin");
    const stateAdmin = await deployment.connectStateAs("admin");
    const alice = await deployment.connectStateAs("alice");
    const bob = await deployment.connectStateAs("bob");
    const aliceId = alice.auth.user!.id;
    const bobId = bob.auth.user!.id;
    expect(admin.db.email_outbox).toBeUndefined();
    await admin.db.records!.insertMany!([
      { owner: aliceId, title: "Alice <evidence>" },
      { owner: bobId, title: "Bob's evidence" },
    ]);
    /* A serialized CLI rule serves all users matching its filter. */
    await expect
      .poll(() => admin.db.reminders!.count!({ config_key: "planning" }))
      .toBe(1);
    const alerts = await admin.db.reminders!.find!({ config_key: "planning" });
    const alertIds = alerts.map((alert) => alert.id);
    const deliveryFilter = { alert_id: { $in: alertIds } };
    for (const alert of alerts) {
      expect(alert.definition).toEqual({
        query: { table: "records", filter: { $and: [] }, select: ["title"] },
        template: {
          title: "Planning reminder",
          body: "{{data.records}}",
          data: { records: { text: "{{title}}", separator: "\n" } },
        },
      });
      expect(alert).toMatchObject({
        user_filter: { type: "default" },
        channels: ["inbox"],
        created_by: null,
      });
    }
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await page.getByRole("button", { name: "Alerts", exact: true }).click();
    const panel = page.getByTestId("Alerts");
    await expect(
      panel.getByText("No unread notifications", { exact: true }),
    ).toBeVisible();
    /* The shared bell shows admin system notices and supports marking them read. */
    const systemNotification = await stateAdmin.db.alerts!.insert(
      {
        title: "System warning",
        message: "Check server settings",
        severity: "warning",
      },
      { returning: "*" },
    );
    await expect(
      panel.getByText("System warning", { exact: true }),
    ).toBeVisible();
    await panel
      .getByRole("button", { name: "Mark as read", exact: true })
      .click();
    await expect(
      panel.getByText("No unread notifications", { exact: true }),
    ).toBeVisible();
    expect(await alice.db.alerts!.count({ id: systemNotification.id })).toBe(0);
    /* Admins manage rules and delivery history from the same panel. */
    await panel.getByText("Rules", { exact: true }).click();
    await expect(
      panel.getByText("Planning reminders", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      panel.getByRole("heading", { name: "Alert recipients" }),
    ).toHaveCount(0);
    await panel.getByText("Delivery history", { exact: true }).click();
    await expect(
      panel.getByText("No deliveries yet", { exact: true }),
    ).toBeVisible();

    /* Retrying a failed success update creates only one notification per recipient. */
    await admin.db.reminders!.update!(
      { id: { $in: alertIds } },
      { enabled: true },
    );
    await expect
      .poll(
        () =>
          admin.db.reminders_deliveries!.count!({
            ...deliveryFilter,
            outcome: "sent",
          }),
        { timeout: 45_000 },
      )
      .toBe(2);
    await admin.db.reminders!.update!(
      { id: { $in: alertIds } },
      { enabled: false },
    );
    const deliveries = await admin.db.reminders_deliveries!.find!({
      ...deliveryFilter,
    });
    const notificationFilter = {
      delivery_id: { $in: deliveries.map((delivery) => delivery.id) },
    };
    expect(await stateAdmin.db.alerts!.count(notificationFilter)).toBe(2);
    /* Recipients see only their own data and cannot alter others' notifications. */
    const aliceNotification = await alice.db.alerts!.findOne({});
    const bobNotification = await bob.db.alerts!.findOne({});
    expect(aliceNotification).toMatchObject({
      user_id: aliceId,
      message: "Alice <evidence>",
      title: "Planning reminder",
    });
    expect(bobNotification).toMatchObject({
      user_id: bobId,
      message: "Bob's evidence",
    });
    expect(await alice.db.alerts!.count({ id: bobNotification!.id })).toBe(0);
    expect(await bob.db.alerts!.count({ id: aliceNotification!.id })).toBe(0);
    await expect(
      alice.db.alert_viewed_by!.insert({ alert_id: bobNotification!.id }),
    ).rejects.toBeTruthy();
    for (const command of ["insert", "update", "delete"]) {
      expect(Object.hasOwn(alice.db.alerts!, command)).toBe(false);
    }
    /* Delivery history exposes the retried job to admins. */
    const jobs = await admin.db.notification_jobs!.find!({
      id: { $in: deliveries.map((delivery) => delivery.job_id) },
    });
    expect(jobs.some((job) => job.attempts === 2)).toBe(true);
    await expect(
      panel.getByRole("button", { name: "View delivery job" }).first(),
    ).toBeVisible();
    await panel
      .getByRole("button", { name: "View delivery job" })
      .first()
      .click();
    await expect(page.getByText("Delivery job", { exact: true })).toBeVisible();

    /* The recipient's bell shows their notification and hides rule management. */
    await page.context().clearCookies();
    await page.context().addCookies(deployment.storageStateAs("alice").cookies);
    await page.goto(deployment.dashboardUrl);
    await page.getByRole("button", { name: "Alerts", exact: true }).click();
    const alicePanel = page.getByTestId("Alerts");
    await expect(
      alicePanel.getByText("Alice <evidence>", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("in-app-notification.png"),
    });
    await expect(
      alicePanel.getByText("Bob's evidence", { exact: true }),
    ).toHaveCount(0);
    await expect(alicePanel.getByText("Rules", { exact: true })).toHaveCount(0);
    /* Read state is per recipient, survives reloads and can be reset to unread. */
    await alicePanel
      .getByRole("button", { name: "Mark as read", exact: true })
      .click();
    await expect(
      alicePanel.getByText("No unread notifications", { exact: true }),
    ).toBeVisible();
    expect(
      await alice.db.alert_viewed_by!.findOne({
        alert_id: aliceNotification!.id,
      }),
    ).toMatchObject({ user_id: aliceId });
    expect(await bob.db.alert_viewed_by!.count({})).toBe(0);
    await page.reload();
    await page.getByRole("button", { name: "Alerts", exact: true }).click();
    await expect(
      alicePanel.getByText("No unread notifications", { exact: true }),
    ).toBeVisible();
    await alicePanel.getByRole("button", { name: "Read", exact: true }).click();
    await expect(
      alicePanel.getByText("Alice <evidence>", { exact: true }),
    ).toBeVisible();
    await alicePanel
      .getByRole("button", { name: "Mark as unread", exact: true })
      .click();
    await alicePanel
      .getByRole("button", { name: "Unread", exact: true })
      .click();
    await expect(
      alicePanel.getByText("Alice <evidence>", { exact: true }),
    ).toBeVisible();
    /* Recipients can view delivery history without gaining access to its jobs. */
    await alicePanel.getByText("Delivery history", { exact: true }).click();
    await expect(
      alicePanel.getByRole("button", { name: "View delivery job" }),
    ).toHaveCount(0);
    expect(await stateAdmin.db.alerts!.count(notificationFilter)).toBe(2);
  } finally {
    await deployment.dispose();
  }
});

test("CLI email outbox retries, snapshots templates and preserves alert permissions", async () => {
  const attempts: { recipient: string; message: string }[] = [];
  let rejectRevokedEmail: (() => void) | undefined;
  const smtp = await startMockSMTPServer({
    port: 0,
    disabledCommands: ["AUTH", "STARTTLS"],
    onEmail: (email, callback) => {
      const { recipient } = email;
      attempts.push(email);
      const reject = () =>
        callback(
          Object.assign(new Error("Temporary failure"), {
            responseCode: 451,
          }),
        );
      if (recipient === "revoked@example.com") {
        rejectRevokedEmail = () => {
          rejectRevokedEmail = undefined;
          reject();
        };
      } else if (
        recipient === "retry@example.com" &&
        attempts.filter((attempt) => attempt.recipient === recipient).length ===
          1
      ) {
        reject();
      } else {
        callback();
      }
    },
  });
  const configPath = createConfigTestProject(
    {
      id: "email-outbox-e2e",
      databaseConfig: { sync_users: true },
      emailOutbox: {
        tableName: "mail_queue",
        templatesTableName: "mail_templates",
        provider: {
          from: "planning@example.com",
          websiteUrl: "http://localhost",
          smtp: {
            type: "smtp",
            host: "127.0.0.1",
            port: smtp.port,
            user: "",
            pass: "",
          },
        },
        templates: {
          welcome: {
            subject: "Hello {{name}}",
            text: "Welcome {{name}}",
            html: "<p>{{name}}</p>",
          },
        },
      },
      jobs: { tableName: "background_jobs", definitions: {} },
      tableConfig: {
        requests: {
          columns: {
            id: "SERIAL PRIMARY KEY",
            key: "TEXT NOT NULL",
            name: "TEXT NOT NULL",
            template: "TEXT NOT NULL DEFAULT 'welcome'",
            rollback: "BOOLEAN NOT NULL DEFAULT false",
            user_id: "UUID",
          },
        },
        records: {
          columns: {
            id: "SERIAL PRIMARY KEY",
            owner: "TEXT NOT NULL",
            title: "TEXT NOT NULL",
          },
        },
        mail_queue: { publish: {} },
        users: {
          columns: {
            id: "UUID PRIMARY KEY",
            username: "TEXT NOT NULL",
            status: "TEXT NOT NULL",
            last_updated: "BIGINT NOT NULL",
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
                tableName: "mail_queue",
                select: {
                  fields: "*",
                  forcedFilterDetailed: {
                    $and: [
                      {
                        type: "=",
                        fieldName: "user_id",
                        contextValue: {
                          objectName: "user",
                          objectPropertyName: "id",
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      ],
    },
    test.info().outputPath("email-config"),
  );
  const configFile = join(configPath, "index.js");
  const lifecyclePath = test.info().outputPath("email-template-lifecycle.txt");
  writeFileSync(
    configFile,
    readFileSync(configFile, "utf8") +
      `
const { renderOutboxEmail } = require(${JSON.stringify(require.resolve("../../../server/dist/server/src/Emails/renderOutboxEmail"))});
module.exports.tableConfig.mail_queue.publish = { insert: true, update: true, delete: true };
module.exports.tableConfig.mail_templates = {
  onMount: async ({ dbo }) => {
    if (!(await dbo.mail_templates.findOne({ key: "alert" })) ||
        !(await dbo.mail_templates.findOne({ key: "welcome" }))) {
      throw new Error("Managed templates must be seeded before custom onMount");
    }
    const recordLifecycle = (event) => require("node:fs").appendFileSync(${JSON.stringify(lifecyclePath)}, event + "\\n");
    recordLifecycle("mount");
    return { onUnmount: () => recordLifecycle("unmount") };
  },
};
let failDeliveryUpdate = true;
module.exports.tableHooks = {
  reminders_deliveries: { beforeEach: [{ commands: { update: 1 }, validate: ({ data }) => {
    if (data.outcome === "sent" && failDeliveryUpdate) {
      failDeliveryUpdate = false;
      throw new Error("Simulate a failure recording alert success after sending");
    }
  } }] },
  requests: { afterEach: [{ commands: { insert: 1 }, validate: async ({ row, dbx }) => {
    const rendered = await renderOutboxEmail(dbx, {
      from: "planning@example.com", to: "retry@example.com",
      userId: row.user_id ?? undefined,
      templateKey: row.template, values: { name: row.name },
    }, module.exports.emailOutbox);
    await dbx.mail_queue.insert(
      { ...rendered, idempotency_key: row.key },
      { onConflict: "DoNothing" },
    );
    if (row.rollback) throw new Error("Rollback requested");
  } }] },
};
module.exports.alerts = {
  tableName: "reminders",
  rules: { outstanding: {
    name: "Email reminders", enabled: false,
    schedule: { cron: "0 9 * * 1", timezone: "UTC" },
    userFilter: { id: { $in: [] } }, channels: ["email"],
    prepare: async ({ clientDb }) => {
      const records = await clientDb.records.find({}, { select: ["title"] });
      return records.length ? { title: "Planning reminder", body: records.map(row => row.title).join("\\n") } : null;
    },
  } },
  channels: { email: { type: "email" } },
};
`,
  );
  let deployment: Awaited<ReturnType<typeof createTestDeployment>> | undefined;
  try {
    deployment = await createTestDeployment({
      configId: "email-outbox-e2e",
      configPath,
      logPath: test.info().outputPath("email-outbox-server.log"),
      users: [
        { key: "admin", type: "admin" },
        { key: "alice", type: "default" },
        { key: "bob", type: "default" },
      ],
    });
    const admin = await deployment.connectProjectAs("admin");
    const alice = await deployment.connectProjectAs("alice");
    const bob = await deployment.connectProjectAs("bob");
    const { db } = admin;
    const userReferences = [
      ["reminders", "created_by"],
      ["reminders_deliveries", "user_id"],
      ["mail_queue", "user_id"],
    ] as const;
    const expectUserReferences = (client: typeof admin) => {
      for (const [tableName, columnName] of userReferences) {
        const column = client.tableSchema
          ?.find((table) => table.name === tableName)
          ?.columns.find((column) => column.name === columnName);
        expect(column?.udt_name).toBe("uuid");
        expect(column?.references).toContainEqual(
          expect.objectContaining({ ftable: "users", fcols: ["id"] }),
        );
      }
    };
    /* User sync adds UUID foreign keys and rejects mail for nonexistent users. */
    expectUserReferences(admin);
    await expect
      .poll(() =>
        db.users!.count!({
          id: {
            $in: [admin, alice, bob].map((client) => client.auth.user!.id),
          },
        }),
      )
      .toBe(3);
    const missingUserId = "00000000-0000-0000-0000-000000000000";
    await expect(
      db.requests!.insert!({
        key: "missing-user",
        name: "Missing user",
        user_id: missingUserId,
      }),
    ).rejects.toMatchObject({ code: "23503" });
    /* Outbox writes stay internal even when custom publish rules allow them. */
    for (const client of [admin, alice]) {
      expect(client.db.mail_queue!.insert).toBeUndefined();
      expect(client.db.mail_queue!.update).toBeUndefined();
      expect(client.db.mail_queue!.delete).toBeUndefined();
    }
    expect(alice.db.mail_templates).toBeUndefined();
    expect(readFileSync(lifecyclePath, "utf8")).toContain("mount\n");
    /* Rolling back a request also rolls back its queued email and delivery job. */
    await expect(
      db.requests!.insert!({
        key: "rolled-back",
        name: "Rollback",
        rollback: true,
      }),
    ).rejects.toBeTruthy();
    expect(
      await db.mail_queue!.count!({ idempotency_key: "rolled-back" }),
    ).toBe(0);
    expect(
      await db.background_jobs!.count!({
        job_name: "__prostgles_emailDelivery",
      }),
    ).toBe(0);
    /* Missing templates or template values reject the email insert. */
    await expect(
      db.requests!.insert!({
        key: "missing-template",
        name: "Missing",
        template: "missing",
      }),
    ).rejects.toBeTruthy();
    await db.mail_templates!.insert!({
      key: "invalid",
      subject: "{{unknown}}",
      text: "text",
      html: "<p>text</p>",
    });
    await expect(
      db.requests!.insert!({
        key: "missing-value",
        name: "Missing",
        template: "invalid",
      }),
    ).rejects.toBeTruthy();
    /* Concurrent identical keys queue one email; SMTP failure retries one job. */
    await Promise.all([
      db.requests!.insert!({ key: "welcome", name: "Alice <&> {{name}}" }),
      db.requests!.insert!({ key: "welcome", name: "Alice <&> {{name}}" }),
    ]);
    await expect
      .poll(
        () =>
          db.mail_queue!.count!({
            idempotency_key: "welcome",
            outcome: "sent",
          }),
        { timeout: 20_000 },
      )
      .toBe(1);
    const welcome = await db.mail_queue!.findOne!({
      idempotency_key: "welcome",
    });
    /* Templates escape HTML values without recursively expanding placeholders. */
    expect(welcome).toMatchObject({
      user_id: null,
      from: "planning@example.com",
      to: "retry@example.com",
      subject: "Hello Alice <&> {{name}}",
      text: "Welcome Alice <&> {{name}}",
      html: "<p>Alice &lt;&amp;&gt; {{name}}</p>",
      template_key: "welcome",
      template_revision: 1,
      outcome: "sent",
    });
    expect(welcome!.sent_at).toBeTruthy();
    await expect
      .poll(() => db.background_jobs!.findOne!({ id: welcome!.job_id }))
      .toMatchObject({ status: "succeeded", attempts: 2 });
    expect(
      attempts.filter((attempt) => attempt.recipient === "retry@example.com"),
    ).toHaveLength(2);
    for (const attempt of attempts)
      expect(attempt.message).toContain(
        `Message-ID: <${String(welcome!.id)}@prostgles>`,
      );
    expect(
      await db.background_jobs!.count!({
        job_name: "__prostgles_emailDelivery",
      }),
    ).toBe(1);
    /* Reusing an idempotency key preserves the original template snapshot. */
    await db.mail_templates!.update!(
      { key: "welcome" },
      { subject: "Updated {{name}}" },
    );
    await db.requests!.insert!({ key: "welcome", name: "Changed" });
    expect(await db.mail_queue!.findOne!({ id: welcome!.id })).toMatchObject({
      subject: "Hello Alice <&> {{name}}",
      template_revision: 1,
    });

    /* Alert emails contain only the records readable by each recipient. */
    const state = await deployment.connectStateAs("admin");
    await state.db.users!.update(
      { id: alice.auth.user!.id },
      { email: "alice@example.com" },
    );
    await state.db.users!.update(
      { id: bob.auth.user!.id },
      { email: "revoked@example.com" },
    );
    await db.records!.insertMany!([
      { owner: alice.auth.user!.id, title: "Alice's <evidence>" },
      { owner: bob.auth.user!.id, title: "Bob's private evidence" },
    ]);
    const [alert] =
      (await db.reminders!.update!(
        { config_key: "outstanding" },
        {
          name: "Email reminders",
          created_by: admin.auth.user!.id,
          enabled: false,
          config_key: "outstanding",
          definition: null,
          user_filter: {
            id: { $in: [alice, bob].map((client) => client.auth.user!.id) },
          },
          channels: ["email"],
          schedule: {
            cron: `${(new Date().getUTCSeconds() + 5) % 60} * * * * *`,
            timezone: "UTC",
          },
        },
        { returning: "*" },
      )) ?? [];
    if (!alert) throw new Error("Configured alert was not seeded");
    await db.reminders!.update!({ id: alert.id }, { enabled: true });
    await expect
      .poll(() => !!rejectRevokedEmail, { timeout: 15_000 })
      .toBe(true);
    await expect
      .poll(() =>
        db.mail_queue!.count!({
          user_id: alice.auth.user!.id,
          outcome: "sent",
        }),
      )
      .toBeGreaterThan(0);
    /* Retry skips delivery when the recipient no longer has matching records. */
    await db.records!.delete!({ owner: bob.auth.user!.id });
    rejectRevokedEmail!();
    await expect
      .poll(() =>
        db.mail_queue!.count!({
          user_id: bob.auth.user!.id,
          outcome: "skipped",
        }),
      )
      .toBeGreaterThan(0);
    await db.reminders!.update!({ id: alert.id }, { enabled: false });
    const aliceEmail = await db.mail_queue!.findOne!({
      user_id: alice.auth.user!.id,
      outcome: "sent",
    });
    expect(aliceEmail).toMatchObject({
      text: "Alice's <evidence>",
      html: "<pre>Alice&#39;s &lt;evidence&gt;</pre>",
      template_key: "alert",
    });
    await expect
      .poll(() =>
        db.reminders_deliveries!.findOne!({
          id: aliceEmail!.alert_delivery_id,
        }),
      )
      .toMatchObject({ outcome: "sent", job_id: aliceEmail!.job_id });
    /* A failed success update retries bookkeeping without sending email again. */
    await expect
      .poll(() => db.background_jobs!.findOne!({ id: aliceEmail!.job_id }))
      .toMatchObject({ status: "succeeded", attempts: 2 });
    expect(
      attempts.filter((attempt) => attempt.recipient === "alice@example.com"),
    ).toHaveLength(1);
    expect(
      await db.background_jobs!.count!({
        job_name: "__prostgles_emailDelivery",
      }),
    ).toBe(1);
    /* Recipients cannot read each other's outbox entries. */
    expect(
      await alice.db.mail_queue!.count!({ user_id: bob.auth.user!.id }),
    ).toBe(0);
    expect(
      await bob.db.mail_queue!.count!({ user_id: alice.auth.user!.id }),
    ).toBe(0);
    expect(
      attempts.filter((attempt) => attempt.recipient === "revoked@example.com"),
    ).toHaveLength(1);

    /* Every managed user reference rejects nonexistent users at database level. */
    for (const [tableName, columnName] of userReferences) {
      await expect(
        admin.sql!(
          `UPDATE "${tableName}" SET "${columnName}" = \${missingUserId} WHERE "${columnName}" = \${userId}`,
          {
            missingUserId,
            userId:
              columnName === "created_by" ?
                admin.auth.user!.id
              : alice.auth.user!.id,
          },
        ),
      ).rejects.toMatchObject({ code: "23503" });
    }
    /* Simulate the previous TEXT schema with populated delivery history. */
    await admin.sql!(
      userReferences
        .map(
          ([tableName, columnName]) =>
            `ALTER TABLE "${tableName}" DROP CONSTRAINT "${tableName}_${columnName}_fkey",
             ALTER COLUMN "${columnName}" TYPE TEXT USING "${columnName}"::text;`,
        )
        .join("\n"),
    );
    /* Migration restores UUID references while preserving templates and history. */
    const { project: reconnected } = await deployment.syncSchema();
    expectUserReferences(reconnected);
    expect(
      await reconnected.db.mail_templates!.findOne!({ key: "welcome" }),
    ).toMatchObject({ subject: "Updated {{name}}", revision: 2 });
    expect(
      await reconnected.db.mail_queue!.findOne!({ id: welcome!.id }),
    ).toMatchObject({ outcome: "sent", template_revision: 1 });
    expect(
      await reconnected.db.mail_queue!.findOne!({ id: aliceEmail!.id }),
    ).toMatchObject({ user_id: alice.auth.user!.id, outcome: "sent" });
    /* Deleting a state user disables the synced user and retains sent history. */
    await state.db.users!.delete({ id: alice.auth.user!.id });
    await expect
      .poll(() => reconnected.db.users!.findOne!({ id: alice.auth.user!.id }))
      .toMatchObject({ status: "disabled" });
    expect(
      await reconnected.db.mail_queue!.findOne!({ id: aliceEmail!.id }),
    ).toMatchObject({ user_id: alice.auth.user!.id, outcome: "sent" });
    expect(readFileSync(lifecyclePath, "utf8")).toContain("unmount\nmount\n");
  } finally {
    rejectRevokedEmail?.();
    await deployment?.dispose();
    await smtp.close();
  }
});
