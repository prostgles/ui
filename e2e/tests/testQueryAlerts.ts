import { appendFileSync } from "node:fs";
import { join } from "node:path";
import type {
  AlertQueryDefinition,
  AlertRule,
} from "../../server/dist/server/src/schemaConfig";
import { createTestDeployment } from "../../server/dist/server/src/testing";
import { createConfigTestProject } from "./utils/createConfigTestProject";
import { testAlertFunctions } from "./testAlertFunctions";
import { expect, test } from "./utils/fixtures";
import {
  clickInsertRow,
  getMonacoValue,
  getTableWindow,
  monacoType,
  openTable,
  type PageWIds,
} from "./utils/utils";

export const testQueryAlerts = async (page: PageWIds) => {
  const customAlert: AlertRule<{
    records: { columns: { title: string } };
  }> = {
    name: "Custom callback",
    enabled: false,
    schedule: { cron: "* * * * * *", timezone: "UTC" },
    userFilter: { id: { $in: [] } },
    channels: ["test"],
    prepare: async ({ clientDb }) => {
      const rows = await clientDb.records.find({}, { select: ["title"] });
      return rows.length ?
          {
            title: "Custom callback",
            body: rows.map(({ title }) => title).join(", "),
          }
        : null;
    },
  };
  const configId = "query-alerts-e2e";
  const rule = getEvidenceRule(14, false);
  const configPath = createConfigTestProject(
    {
      id: configId,
      databaseConfig: { sync_users: true },
      tableConfig: {
        users: {
          columns: {
            id: "UUID PRIMARY KEY",
            username: "TEXT NOT NULL",
            status: "TEXT NOT NULL",
            last_updated: "BIGINT NOT NULL",
          },
        },
        projects: {
          columns: { id: "integer PRIMARY KEY", archived: "boolean NOT NULL" },
        },
        project_members: {
          columns: {
            id: "serial PRIMARY KEY",
            project_id: "integer REFERENCES projects(id)",
            user_id: "text NOT NULL",
          },
        },
        records: {
          columns: {
            id: "serial PRIMARY KEY",
            project_id: "integer REFERENCES projects(id)",
            owner: "text NOT NULL",
            title: "text NOT NULL",
            due_date: "date",
            state: "text NOT NULL DEFAULT 'pending'",
            secret: "text",
          },
        },
        sent: {
          columns: {
            id: "uuid PRIMARY KEY",
            recipient: "text NOT NULL",
            title: "text NOT NULL",
            body: "text NOT NULL",
          },
        },
      },
      alerts: {
        channels: {},
      },
      accessControl: [
        {
          userTypes: ["default"],
          dbPermissions: {
            type: "Custom",
            customTables: [
              { tableName: "projects", select: true },
              { tableName: "project_members", select: true },
              {
                tableName: "records",
                select: {
                  fields: [
                    "id",
                    "project_id",
                    "owner",
                    "title",
                    "due_date",
                    "state",
                  ],
                  forcedFilterDetailed: {
                    $and: [
                      {
                        fieldName: "owner",
                        type: "=",
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
    test.info().outputPath("query-alerts-config"),
  );
  appendFileSync(
    join(configPath, "index.js"),
    `
module.exports.alerts.rules = { custom: ${JSON.stringify(customAlert)} };
module.exports.alerts.rules.custom.prepare = ${customAlert.prepare.toString()};
module.exports.alerts.channels.test = {
  send: async ({ dbo, message, recipientId, idempotencyKey }) => {
    await dbo.sent.insert({ id: idempotencyKey, recipient: recipientId, ...message }, { onConflict: "DoNothing" });
    return { providerId: idempotencyKey };
  },
};
module.exports.alerts.channels.secondary = module.exports.alerts.channels.test;
`,
  );
  const deployment = await createTestDeployment({
    configId,
    configPath,
    logPath: test.info().outputPath("query-alerts-server.log"),
    users: [
      { key: "admin", type: "admin" },
      { key: "alice", type: "default" },
      { key: "outsider", type: "default" },
    ],
  });
  try {
    const admin = await deployment.connectProjectAs("admin");
    const alice = await deployment.connectProjectAs("alice");
    const outsider = await deployment.connectProjectAs("outsider");
    const db = admin.db;
    expect(
      await db.alerts_channels!.find!({}, { orderBy: { id: 1 } }),
    ).toEqual([{ id: "secondary" }, { id: "test" }]);
    expect(db.alerts_channels!.insert).toBeUndefined();
    expect(db.alerts_channels!.update).toBeUndefined();
    expect(db.alerts_channels!.delete).toBeUndefined();
    /* Historical channels remain stored but cannot be selected for new deliveries. */
    await admin.sql!("INSERT INTO alerts_channels (id) VALUES ('retired')");
    const adminId = admin.auth.user!.id;
    const aliceId = alice.auth.user!.id;
    const outsiderId = outsider.auth.user!.id;
    const timezone = "Pacific/Kiritimati";
    const currentDate = await admin.sql!("SELECT CURRENT_DATE::text", [], {
      returnType: "value",
    });
    await db.projects!.insertMany!([
      { id: 1, archived: false },
      { id: 2, archived: true },
    ]);
    await db.project_members!.insertMany!([
      { project_id: 1, user_id: adminId },
      { project_id: 1, user_id: aliceId },
      { project_id: 2, user_id: aliceId },
    ]);
    await admin.sql!(
      `INSERT INTO records (owner, title, project_id, due_date, state, secret) VALUES
       ($1, 'Admin evidence', 1, $3::date, 'pending', 'admin secret'),
       ($2, 'Alice <evidence>', 1, $3::date, 'pending', 'private'),
       ($2, 'Overdue evidence', 1, $3::date - 1, 'pending', NULL),
       ($2, 'Boundary evidence', 1, $3::date + 14, 'pending', NULL),
       ($2, 'Future evidence', 1, $3::date + 15, 'pending', NULL),
       ($2, 'Accepted evidence', 1, $3::date, 'accepted', NULL),
       ($2, 'Archived evidence', 2, $3::date, 'pending', NULL),
       ($2, 'High risk', 1, NULL, 'high', NULL)`,
      [adminId, aliceId, currentDate],
    );
    /* Query alerts persist the query and template without a registered type. */
    const draft = await db.alerts!.insert!(
      {
        name: "Planning reminders",
        created_by: adminId,
        enabled: false,
        definition: rule,
        user_filter: {
          $and: [
            { id: { $in: [] } },
            { $or: [{ type: "default" }, { type: "admin" }] },
          ],
        },
        channels: ["test"],
        schedule: { cron: "* * * * * *", timezone },
      },
      { returning: "*" },
    );
    expect(draft.definition).toEqual(rule);
    await expect(
      db.alerts!.update!({ id: draft.id }, { channels: ["retired"] }),
    ).rejects.toBeTruthy();

    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await openTable(page, "alerts", true);

    const definitionEditor =
      '[data-command="SmartFormField"][data-key="definition"]';
    await test.step("Edit a new alert's query as JSON", async () => {
      await clickInsertRow(page, "alerts");
      await page
        .locator(definitionEditor)
        .getByRole("button", { name: "JSON", exact: true })
        .click();
      const newDefinition = getEvidenceRule(0, false);
      await monacoType(
        page,
        definitionEditor,
        JSON.stringify(newDefinition, null, 2),
        { keyPressDelay: 0 },
      );
      expect(JSON.parse(await getMonacoValue(page, definitionEditor))).toEqual(
        newDefinition,
      );
      await page.getByTestId("Popup.close").last().click();
    });

    await test.step("Edit the persisted query and message template in the alert form", async () => {
      await page.getByRole("button", { name: "Alerts", exact: true }).click();
      const alertsPanel = page.getByTestId("Alerts");
      const alertsHeader = alertsPanel.getByTestId("Popup.header");
      await alertsHeader
        .getByRole("button", { name: "Rules", exact: true })
        .click();
      await alertsPanel
        .locator(".SmartCard")
        .filter({ hasText: "Planning reminders" })
        .getByTestId("SmartCard.viewEditRow")
        .click();
      const definitionField = page.locator(definitionEditor);
      await expect(
        definitionField.getByRole("textbox", {
          name: "Message title",
          exact: true,
        }),
      ).toHaveValue(rule.template.title);
      await definitionField
        .getByRole("button", { name: "JSON", exact: true })
        .click();
      expect(JSON.parse(await getMonacoValue(page, definitionEditor))).toEqual(
        draft.definition,
      );
      const editedFilter = {
        $and: [
          rule.query.filter,
          {
            fieldName: "state",
            type: "$ne",
            value: "pending",
            disabled: false,
            minimised: false,
          },
        ],
      };
      const editedDefinition = {
        ...rule,
        query: { ...rule.query, filter: editedFilter },
        template: {
          ...rule.template,
          title: "Planning deadline reminder",
          body: "Due soon:\n{{data.evidence}}",
        },
      };
      await monacoType(
        page,
        definitionEditor,
        JSON.stringify(
          { ...rule, query: editedDefinition.query },
          null,
          2,
        ).replace('"pending"', '"dismissed"'),
        { keyPressDelay: 0 },
      );
      await definitionField
        .getByRole("button", { name: "Form", exact: true })
        .click();
      const queryConditions = definitionField.getByTestId("RenderFilter.edit");
      await expect(queryConditions).toContainText("dismissed");
      await queryConditions.click();
      await expect(page.getByTestId("JoinedFilterControl")).toBeVisible();
      await expect(page.locator(".AgeFilter")).toHaveCount(2);
      const stateCondition = page
        .locator('[data-command="FilterWrapper"][data-key="state"]')
        .last();
      const stateInput = stateCondition.locator(
        '.SmartSearch input[type="text"]',
      );
      await stateInput.fill("pending");
      await page.locator('[data-label="pending"]').last().click();
      await expect(stateInput).toHaveValue("pending");
      await expect(queryConditions).toContainText("pending");
      await page.getByTestId("RenderFilter.done").click();
      await definitionField
        .getByRole("textbox", { name: "Message title", exact: true })
        .fill(editedDefinition.template.title);
      await definitionField
        .getByRole("textbox", { name: "Message body", exact: true })
        .fill(editedDefinition.template.body);
      const scheduleField = page.locator(
        '[data-command="SmartFormField"][data-key="schedule"]',
      );
      await expect(
        scheduleField.getByRole("textbox", {
          name: "Cron expression",
          exact: true,
        }),
      ).toHaveValue("* * * * * *");
      const chooseFrequency = async (key: string) => {
        await scheduleField.locator(".FormField_Select").first().click();
        await page
          .getByTestId("SearchList.List")
          .locator(`[data-key="${key}"]`)
          .click();
      };
      await chooseFrequency("weekdays");
      await scheduleField.locator('input[type="time"]').fill("08:30");
      await expect(scheduleField).toContainText("Weekdays at 08:30");
      await expect(
        scheduleField.getByRole("textbox", {
          name: "Cron expression",
          exact: true,
        }),
      ).not.toBeVisible();
      await chooseFrequency("weekly");
      await expect(scheduleField).toContainText("Every Monday at 08:30");
      await chooseFrequency("monthly");
      await expect(scheduleField).toContainText("Monthly on day 1 at 08:30");
      await chooseFrequency("hourly");
      await expect(scheduleField).toContainText("Minutes past the hour");
      await chooseFrequency("daily");
      await scheduleField.locator('input[type="time"]').fill("09:00");
      await chooseFrequency("custom");
      await expect(
        scheduleField.getByRole("textbox", {
          name: "Cron expression",
          exact: true,
        }),
      ).toHaveValue("0 9 * * *");
      await chooseFrequency("daily");
      await page
        .getByRole("textbox", { name: "Timezone", exact: true })
        .fill("Europe/London");
      const recipientsField = page.locator(
        '[data-command="SmartFormField"][data-key="user_filter"]',
      );
      await recipientsField.getByTestId("RenderFilter.edit").click();
      await page
        .locator('[data-command="FilterWrapper"][data-key="id"]')
        .getByText(aliceId, { exact: true })
        .click();
      await expect(
        recipientsField.getByTestId("RenderFilter.edit"),
      ).toContainText(aliceId);
      await page.getByTestId("RenderFilter.done").click();
      const channelsField = page.locator(
        '[data-command="SmartFormField"][data-key="channels"]',
      );
      await expect(
        channelsField.getByRole("textbox", { name: "Search", exact: true }),
      ).toHaveValue("test");
      await channelsField
        .getByRole("button", { name: "Add new item", exact: true })
        .click();
      const channelInput = page
        .getByRole("dialog")
        .filter({
          has: page.getByRole("heading", { name: "Add new item", exact: true }),
        })
        .last()
        .getByRole("textbox", { name: "Search", exact: true });
      await channelInput.click();
      const channelOptions = page.getByTestId("SearchList.List");
      const secondaryChannel = channelOptions.getByRole("option", {
        name: "secondary",
        exact: true,
      });
      await expect(secondaryChannel).toBeVisible();
      await expect(
        channelOptions.getByRole("option", { name: "retired", exact: true }),
      ).toHaveCount(0);
      await secondaryChannel.click();
      await expect(
        channelsField
          .getByRole("textbox", { name: "Search", exact: true })
          .last(),
      ).toHaveValue("secondary");
      expect((await db.alerts!.findOne!({ id: draft.id }))!.definition).toEqual(
        draft.definition,
      );
      await expect(
        definitionField.getByRole("textbox", {
          name: "Message title",
          exact: true,
        }),
      ).toHaveValue(editedDefinition.template.title);
      await expect(
        definitionField.getByRole("textbox", {
          name: "Message body",
          exact: true,
        }),
      ).toHaveValue(editedDefinition.template.body);
      await page.getByTestId("SmartForm.update").click();
      await page
        .getByRole("button", { name: "Update row!", exact: true })
        .click();
      await expect
        .poll(
          async () =>
            (await db.alerts!.findOne!({ id: draft.id }))?.definition.template
              .title,
        )
        .toBe("Planning deadline reminder");
      await expect(page.getByTestId("SmartForm")).not.toBeVisible();
      expect((await db.alerts!.findOne!({ id: draft.id }))!.definition).toEqual(
        editedDefinition,
      );
      expect((await db.alerts!.findOne!({ id: draft.id }))!.schedule).toEqual({
        cron: "0 9 * * *",
        timezone: "Europe/London",
      });
      expect(await db.alerts!.findOne!({ id: draft.id })).toMatchObject({
        user_filter: {
          $and: [
            { "id.$in": [aliceId] },
            { $or: [{ type: "default" }, { type: "admin" }] },
          ],
        },
        channels: ["test", "secondary"],
      });
      await expect(alertsPanel).toContainText(
        "records · Planning deadline reminder",
      );
      await expect(alertsPanel).toContainText(
        "Every day at 09:00 · Europe/London",
      );
      await alertsHeader
        .getByRole("button", { name: "Delivery history", exact: true })
        .click();
      await expect(alertsPanel).toContainText("No deliveries yet");
      await alertsHeader
        .getByRole("button", { name: "Notifications", exact: true })
        .click();
      await expect(
        alertsPanel.getByRole("button", { name: "Unread", exact: true }),
      ).toBeVisible();
      await alertsPanel.getByTestId("Popup.close").click();
    });

    await testAlertFunctions({ page, deployment });

    const deliver = async (
      savedDefinition: Record<string, unknown> | null,
      recipients: string[],
      name: string,
      expectedError?: string,
      configKey?: string,
    ) => {
      const alertData = {
        name,
        created_by: adminId,
        enabled: false,
        definition: savedDefinition,
        user_filter: { id: { $in: recipients } },
        channels: ["test"],
        schedule: { cron: "* * * * * *", timezone },
      };
      const [alert] =
        configKey ?
          ((await db.alerts!.update!({ config_key: configKey }, alertData, {
            returning: "*",
          })) ?? [])
        : [await db.alerts!.insert!(alertData, { returning: "*" })];
      if (!alert) throw new Error("Alert was not saved");
      await db.alerts!.update!({ id: alert.id }, { enabled: true });
      try {
        await expect
          .poll(() => db.alerts_deliveries!.count!({ alert_id: alert.id }), {
            timeout: 15_000,
          })
          .toBeGreaterThan(0);
        const first = (await db.alerts_deliveries!.findOne!(
          { alert_id: alert.id },
          { orderBy: { occurrence: 1 } },
        ))!;
        const filter = { alert_id: alert.id, occurrence: first.occurrence };
        if (expectedError) {
          await expect
            .poll(
              async () =>
                (await db.prostgles_jobs!.findOne!({ id: first.job_id }))
                  ?.status,
              { timeout: 15_000 },
            )
            .toBe("failed");
          const job = (await db.prostgles_jobs!.findOne!({
            id: first.job_id,
          }))!;
          expect(JSON.stringify(job.error)).toContain(expectedError);
          expect(await db.sent!.count!({ id: first.id })).toBe(0);
          return { deliveries: [first], messages: [] };
        }
        await expect
          .poll(
            () =>
              db.alerts_deliveries!.count!({
                ...filter,
                outcome: { $ne: "pending" },
              }),
            { timeout: 15_000 },
          )
          .toBe(recipients.length);
        const deliveries = await db.alerts_deliveries!.find!(filter);
        return {
          deliveries,
          messages: await db.sent!.find!({
            id: { $in: deliveries.map(({ id }) => id) },
          }),
        };
      } finally {
        await db.alerts!.update!({ id: alert.id }, { enabled: false });
      }
    };

    await test.step("Respect recipient permissions and filter relative dates with normal age filters", async () => {
      const { deliveries, messages } = await deliver(
        rule,
        [adminId, aliceId, outsiderId],
        "Evidence with recipient permissions",
      );
      expect(
        deliveries.find(({ user_id }) => user_id === outsiderId)?.outcome,
      ).toBe("skipped");
      const adminMessage = messages.find(
        ({ recipient }) => recipient === adminId,
      );
      expect(adminMessage?.title).toBe("Evidence due: 3");
      expect(adminMessage?.body).toContain(`${currentDate}: Admin evidence`);
      expect(adminMessage?.body).toContain("Alice <evidence>");
      expect(adminMessage?.body).toContain("Boundary evidence");
      const aliceMessage = messages.find(
        ({ recipient }) => recipient === aliceId,
      )!;
      expect(aliceMessage.title).toBe("Evidence due: 2");
      expect(aliceMessage.body).toContain("Alice <evidence>");
      expect(aliceMessage.body).toContain("Boundary evidence");
      expect(aliceMessage.body).not.toMatch(
        /Admin|Overdue|Future|Accepted|Archived/,
      );
      expect(deliveries[0]!.definition).toEqual(rule);
      const overdue = await deliver(
        getEvidenceRule(0, true),
        [aliceId],
        "Overdue evidence",
      );
      expect(overdue.messages[0]!.body).toContain("Overdue evidence");
      expect(overdue.messages[0]!.body).not.toContain("Boundary evidence");
    });

    await test.step("Combine nested AND/OR filters and render null values", async () => {
      const digest: AlertQueryDefinition = {
        query: {
          table: "records",
          filter: {
            $or: [
              { fieldName: "state", type: "=", value: "high" },
              {
                $and: [
                  { fieldName: "state", type: "=", value: "missing" },
                  { fieldName: "due_date", type: "not null" },
                ],
              },
              {
                fieldName: "state",
                type: "=",
                value: "pending",
                disabled: true,
              },
            ],
          },
          select: ["title", "due_date"],
        },
        template: {
          title: "Weekly planning risks",
          body: "{{data.risks}}",
          data: {
            risks: {
              text: "{{title}}: {{due_date}}",
              separator: "\n",
              nullText: "unset",
            },
          },
        },
      };
      const result = await deliver(
        digest,
        [aliceId, outsiderId],
        "Weekly risk digest",
      );
      expect(result.messages.map(({ body }) => body)).toEqual([
        "High risk: unset",
      ]);
    });

    await test.step("Filter aggregate thresholds in the query", async () => {
      const aggregate: AlertQueryDefinition = {
        query: {
          table: "records",
          filter: {
            $and: [{ fieldName: "state", type: "=", value: "missing" }],
          },
          select: { count: { $countAll: [] } },
          having: {
            $and: [{ fieldName: "count", type: ">", value: 0 }],
          },
        },
        template: {
          title: "Threshold",
          body: "{{rows.0.count}}",
          data: {},
        },
      };
      expect(
        (await deliver(aggregate, [aliceId], "Zero count below threshold"))
          .messages,
      ).toEqual([]);
      for (const [state, operator, expectedCount] of [
        ["missing", "=", "0"],
        ["high", ">", "1"],
      ] as const) {
        const { messages } = await deliver(
          {
            ...aggregate,
            query: {
              ...aggregate.query,
              filter: {
                $and: [{ fieldName: "state", type: "=", value: state }],
              },
              having: {
                $and: [{ fieldName: "count", type: operator, value: 0 }],
              },
            },
          },
          [aliceId],
          `Count ${operator} zero`,
        );
        expect(messages.map(({ body }) => body)).toEqual([expectedCount]);
      }
    });

    await test.step("Skip empty results before rendering templates", async () => {
      const empty: AlertQueryDefinition = {
        query: {
          table: "records",
          filter: {
            $and: [{ fieldName: "state", type: "=", value: "missing" }],
          },
          select: ["title"],
        },
        template: {
          title: "Empty result",
          body: "{{rows.0.title}}",
          data: {},
        },
      };
      expect(
        (await deliver(empty, [aliceId], "Empty result")).messages,
      ).toEqual([]);
    });

    await test.step("Run configured callbacks directly and reject invalid saved rules", async () => {
      const custom = await deliver(
        null,
        [aliceId],
        "Custom callback",
        undefined,
        "custom",
      );
      expect(custom.deliveries[0]!.definition).toBeNull();
      expect(custom.messages[0]!.title).toBe("Custom callback");
      expect(custom.messages[0]!.body).not.toContain("Admin evidence");
      for (const invalidRule of [
        { template: rule.template },
        { rule },
        { type: "custom", params: { title: "Custom callback" } },
        { ...rule, type: "custom", params: {} },
        { ...rule, params: { daysAhead: 14 } },
        { ...rule, query: {} },
        { ...rule, query: [rule.query] },
        { ...rule, queries: { evidence: rule.query } },
        { ...rule, when: { match: "all", conditions: [] } },
        ...[
          { state: "pending" },
          { $and: [{ $or: [{ state: "pending" }] }] },
          { $and: [{ fieldName: "state", type: "invalid", value: "pending" }] },
          {
            $and: [{ type: "$existsJoined", path: [], filter: { $and: [] } }],
          },
        ].map((filter) => ({
          ...rule,
          query: { ...rule.query, filter },
        })),
        ...[
          { count: 0 },
          { $and: [{ fieldName: "count", type: "invalid", value: 0 }] },
        ].map((having) => ({
          ...rule,
          query: { ...rule.query, having },
        })),
        {
          ...rule,
          template: {
            ...rule.template,
            data: {
              bad: { query: "missing", text: "{{title}}", separator: "" },
            },
          },
        },
        {
          ...rule,
          query: { ...rule.query, command: "delete" },
        },
      ]) {
        await expect(
          db.alerts!.update!({ id: draft.id }, { definition: invalidRule }),
        ).rejects.toBeTruthy();
      }
      await deliver(
        {
          ...rule,
          query: { ...rule.query, select: ["secret"] },
        },
        [aliceId],
        "Forbidden field",
        "secret",
      );
      await deliver(
        {
          ...rule,
          query: {
            table: "sent",
            filter: { $and: [] },
            select: ["body"],
          },
        },
        [aliceId],
        "Forbidden table",
        "Alert query cannot read sent",
      );
      await deliver(
        {
          ...rule,
          template: { ...rule.template, title: "{{rows.constructor}}" },
        },
        [aliceId],
        "Invalid template reference",
        "Missing email template value",
      );
      await openTable(page, "sent", true);
      await expect(getTableWindow(page, "sent")).toContainText(
        "High risk: unset",
      );
      await expect(getTableWindow(page, "sent")).toContainText(
        "Custom callback",
      );
      /* Schema sync preserves user-edited query templates. */
      const { project: reconnected } = await deployment.syncSchema();
      expect(
        (await reconnected.db.alerts!.findOne!({ id: draft.id }))!.definition
          .template.title,
      ).toBe("Planning deadline reminder");
    });
  } finally {
    await deployment.dispose();
  }
};

const getEvidenceRule = (
  daysAhead: number,
  includeOverdue: boolean,
): AlertQueryDefinition => ({
  query: {
    table: "records",
    filter: {
      $and: [
        {
          type: "$existsJoined",
          path: ["projects"],
          filter: { fieldName: "archived", type: "=", value: false },
        },
        { fieldName: "state", type: "$ne", value: "accepted" },
        {
          fieldName: "due_date",
          type: "$age",
          value: "0 days",
          disabled: includeOverdue,
          complexFilter: {
            type: "controlled",
            funcName: "$age",
            argsLeftToRight: true,
            comparator: "<=",
          },
        },
        {
          fieldName: "due_date",
          type: "$age",
          value: `${-daysAhead} days`,
          complexFilter: {
            type: "controlled",
            funcName: "$age",
            argsLeftToRight: true,
            comparator: ">=",
          },
        },
      ],
    },
    select: ["title", "due_date"],
    orderBy: { due_date: 1 },
  },
  template: {
    title: "Evidence due: {{rows.length}}",
    body: "{{data.evidence}}",
    data: {
      evidence: {
        text: "{{due_date}}: {{title}}",
        separator: "\n",
      },
    },
  },
});
