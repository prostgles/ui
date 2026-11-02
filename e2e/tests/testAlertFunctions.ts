import { randomUUID } from "node:crypto";
import type { AlertQueryDefinition } from "../../server/dist/server/src/schemaConfig";
import type { TestDeployment } from "../../server/dist/server/src/testing";
import { expect, test } from "./utils/fixtures";
import type { PageWIds } from "./utils/utils";

export const testAlertFunctions = async ({
  page,
  deployment,
}: {
  page: PageWIds;
  deployment: TestDeployment;
}) => {
  const admin = await deployment.connectProjectAs("admin");
  const alice = await deployment.connectProjectAs("alice");
  const outsider = await deployment.connectProjectAs("outsider");
  const db = admin.db;
  const adminId = admin.auth.user!.id;
  const preview = admin.methods!.previewAlert!;
  const sendTest = admin.methods!.sendTestAlert!;
  const definition: AlertQueryDefinition = {
    query: {
      table: "records",
      filter: { $and: [] },
      select: ["id", "title"],
      orderBy: { id: 1 },
    },
    template: {
      title: "Alert test preview",
      body: "{{rows.0.title}}",
      data: {},
    },
    deduplicate: { key: ["id"], for: "24h" },
  };
  const alert = await db.alerts!.insert!(
    {
      name: "Test alert functions",
      enabled: false,
      user_filter: { id: alice.auth.user!.id },
      channels: ["test"],
      schedule: { cron: "0 0 1 1 *", timezone: "UTC" },
      definition,
    },
    { returning: "*" },
  );

  await test.step("Alert functions expose JSONB lookups and preview without deliveries", async () => {
    expect(admin.methodSchema!.previewAlert!.input).toMatchObject({
      alertId: { type: "ValueLookup", table: "alerts", column: "id" },
      recipientId: { type: "ValueLookup", table: "users", column: "id" },
    });
    expect(admin.methodSchema!.sendTestAlert!.input).toMatchObject({
      alertId: { type: "ValueLookup", table: "alerts", column: "id" },
      channel: { type: "ValueLookup", table: "alerts_channels", column: "id" },
    });
    expect(alice.methods?.previewAlert).toBeUndefined();
    expect(alice.methods?.sendTestAlert).toBeUndefined();
    expect(await preview({ alertId: alert.id })).toEqual({
      title: definition.template.title,
      body: "Admin evidence",
    });
    const alicePreview = await preview({
      alertId: alert.id,
      recipientId: alice.auth.user!.id,
    });
    expect(JSON.stringify(alicePreview)).toContain("Alice");
    expect(JSON.stringify(alicePreview)).not.toContain("Admin evidence");
    expect(
      await preview({ alertId: alert.id, recipientId: outsider.auth.user!.id }),
    ).toEqual({
      reason: "No matching items to notify",
    });
    await expect(preview({ alertId: randomUUID() })).rejects.toBeTruthy();
    await expect(
      preview({ alertId: alert.id, recipientId: randomUUID() }),
    ).rejects.toBeTruthy();
    await expect(
      sendTest({ alertId: alert.id, channel: "retired" }),
    ).rejects.toBeTruthy();
    await expect(
      sendTest({ alertId: alert.id, channel: "secondary" }),
    ).rejects.toBeTruthy();
    const callback = await db.alerts!.findOne!({ config_key: "custom" });
    expect(await preview({ alertId: callback!.id })).toEqual({
      title: "Custom callback",
      body: expect.stringContaining("Alice <evidence>"),
    });
    await db.alerts!.update!(
      { id: alert.id },
      {
        definition: {
          ...definition,
          query: { ...definition.query, select: ["secret"] },
        },
      },
    );
    await expect(
      preview({ alertId: alert.id, recipientId: alice.auth.user!.id }),
    ).rejects.toBeTruthy();
    await db.alerts!.update!({ id: alert.id }, { definition });
    expect(await db.alerts_deliveries!.count!()).toBe(0);
    expect(await db.sent!.count!()).toBe(0);
  });

  await test.step("Alert cards preview a selected user and send a disabled alert to the caller", async () => {
    await page.getByRole("button", { name: "Alerts", exact: true }).click();
    const alertsPanel = page.getByTestId("Alerts");
    const alertsHeader = alertsPanel.getByTestId("Popup.header");
    await expect(alertsHeader.locator("h4 > .FlexRow")).toHaveCSS(
      "display",
      "flex",
    );
    await expect(alertsHeader.locator(".SegmentedToggle")).toHaveCSS(
      "display",
      "flex",
    );
    await expect(alertsHeader.locator(".SegmentedToggle")).toHaveCSS(
      "flex-direction",
      "row",
    );
    await alertsPanel
      .getByRole("button", { name: "Rules", exact: true })
      .click();
    const card = alertsPanel
      .locator(".SmartCard")
      .filter({ hasText: "Test alert functions" });
    await card.getByRole("button", { name: "Preview", exact: true }).click();
    const popup = page.getByTestId("ActionPopup");
    await popup.getByRole("button", { name: "Show more", exact: true }).click();
    await popup.locator(".SmartSearch input").fill(alice.auth.user!.id);
    await page
      .getByTestId("SearchList.List")
      .locator(`[data-label="${alice.auth.user!.id}"]`)
      .click();
    await popup.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(popup.getByLabel("Action result")).toContainText("Alice");
    await expect(popup.getByLabel("Action result")).not.toContainText(
      "Admin evidence",
    );
    await popup.getByTestId("Popup.close").click();
    await card.getByRole("button", { name: "Send test", exact: true }).click();
    /* Empty lookups offer selectable suggestions without typing. */
    await popup.locator(".SmartSearch input").click();
    await page
      .getByTestId("SearchList.List")
      .locator('[data-label="test"]')
      .click();
    await test.step("Test sends report missing data without queuing a delivery", async () => {
      await db.alerts!.update!(
        { id: alert.id },
        {
          definition: {
            ...definition,
            query: {
              ...definition.query,
              filter: { $and: [{ fieldName: "id", type: "=", value: -1 }] },
            },
          },
        },
      );
      try {
        await popup
          .getByRole("button", { name: "Send test", exact: true })
          .click();
        await expect(popup).toContainText(
          "Cannot send test alert: no matching items to notify",
        );
        expect(await db.alerts_deliveries!.count!()).toBe(0);
        expect(await db.sent!.count!()).toBe(0);
      } finally {
        await db.alerts!.update!({ id: alert.id }, { definition });
      }
    });
    await popup.getByRole("button", { name: "Send test", exact: true }).click();
    await expect(popup.getByLabel("Action result")).toContainText("deliveryId");
    await popup.getByTestId("Popup.close").click();
    await alertsPanel.getByTestId("Popup.close").click();
    await expect
      .poll(() =>
        db.alerts_deliveries!.count!({ alert_id: alert.id, outcome: "sent" }),
      )
      .toBe(1);
    const delivery = await db.alerts_deliveries!.findOne!({
      alert_id: alert.id,
    });
    expect(delivery).toMatchObject({
      user_id: adminId,
      is_test: true,
      deduplication_keys: null,
    });
    expect(await db.sent!.findOne!({ id: delivery!.id })).toMatchObject({
      recipient: adminId,
      title: "[TEST] Alert test preview",
      body: "Admin evidence",
    });
    expect(await db.alerts!.findOne!({ id: alert.id })).toMatchObject({
      enabled: false,
    });
  });

  await test.step("Test sends neither suppress normal deliveries nor get suppressed by them", async () => {
    await db.alerts!.update!(
      { id: alert.id },
      {
        enabled: true,
        user_filter: { id: adminId },
        schedule: { cron: "* * * * * *", timezone: "UTC" },
      },
    );
    try {
      await expect
        .poll(
          () =>
            db.alerts_deliveries!.count!({
              alert_id: alert.id,
              is_test: false,
              outcome: "sent",
            }),
          { timeout: 15_000 },
        )
        .toBe(1);
      await expect
        .poll(
          () =>
            db.alerts_deliveries!.count!({
              alert_id: alert.id,
              is_test: false,
              outcome: "skipped",
            }),
          { timeout: 15_000 },
        )
        .toBeGreaterThan(0);
      await sendTest({ alertId: alert.id, channel: "test" });
      await expect
        .poll(
          () =>
            db.alerts_deliveries!.count!({
              alert_id: alert.id,
              is_test: true,
              outcome: "sent",
            }),
          { timeout: 15_000 },
        )
        .toBe(2);
      expect(await preview({ alertId: alert.id })).toMatchObject({
        body: "Admin evidence",
      });
    } finally {
      await db.alerts!.update!({ id: alert.id }, { enabled: false });
    }
  });
};
