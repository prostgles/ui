import type { DBSSchema } from "common/publishUtils";
import type { Page } from "@playwright/test";
import { expect, test } from "../utils/fixtures";
import { runDbsMethod, runDbsSql, type PageWIds } from "../utils/utils";

export const testRemoteMcpRecovery = async (
  page: PageWIds,
  mcpOrigin: string,
  keycloakOrigin: string,
) => {
  const appOrigin = new URL(page.url()).origin;
  const getConfig = async () => {
    const [config] = (await runDbsSql(
      page,
      "SELECT * FROM mcp_server_configs WHERE server_name = 'mock'",
      undefined,
      { returnType: "rows" },
    )) as DBSSchema["mcp_server_configs"][];
    if (!config || config.oauth?.phase !== "connected")
      throw new Error("Mock MCP is not connected");
    return { ...config, oauth: config.oauth };
  };
  const reloadTools = () =>
    runDbsMethod(page, "reloadMcpServerTools", { serverName: "mock" });
  const getSessionCount = async () => {
    const response = await page.request.get(`${mcpOrigin}/test/status`);
    const { initializedSessions } = (await response.json()) as {
      initializedSessions: number;
    };
    return initializedSessions;
  };

  await test.step("Expired access tokens refresh without restarting the connection", async () => {
    const config = await getConfig();
    expect(typeof config.oauth.tokens.refresh_token).toBe("string");
    const sessionCount = await getSessionCount();
    await page.request.post(`${mcpOrigin}/test/expire-access-tokens`);
    expect(await reloadTools()).toBe(1);
    await expect
      .poll(
        async () =>
          (await getConfig()).oauth.tokens.access_token !==
          config.oauth.tokens.access_token,
      )
      .toBe(true);
    expect(await getSessionCount()).toBe(sessionCount);
  });

  await test.step("An expired SSE session reconnects with a new MCP session", async () => {
    const sessionCount = await getSessionCount();
    await page.request.post(`${mcpOrigin}/test/expire-sessions`);
    await expect
      .poll(getSessionCount, { timeout: 20_000 })
      .toBeGreaterThan(sessionCount);
    expect(await reloadTools()).toBe(1);
    expect((await getConfig()).oauth.phase).toBe("connected");
  });

  await test.step("A request rejected with HTTP 404 retries after session initialization", async () => {
    await page.request.post(`${mcpOrigin}/test/expire-sessions`);
    expect(await reloadTools()).toBe(1);
  });

  await test.step("A revoked refresh token prompts for re-auth outside settings and closes the config after reconnection", async () => {
    const config = await getConfig();
    const client = config.oauth.clientInformation;
    const revoke = await page.request.post(
      `${keycloakOrigin}/realms/mcp/protocol/openid-connect/revoke`,
      {
        form: {
          client_id: String(client.client_id),
          ...(typeof client.client_secret === "string" ?
            { client_secret: client.client_secret }
          : {}),
          token: String(config.oauth.tokens.refresh_token),
          token_type_hint: "refresh_token",
        },
      },
    );
    expect(revoke.ok()).toBe(true);
    await page.goto(`${appOrigin}/connections`);
    await page.request.post(`${mcpOrigin}/test/expire-access-tokens`);
    await reloadTools().catch(() => undefined);
    await expect(
      page.getByText("mock needs authentication", { exact: true }),
    ).toBeVisible({ timeout: 20_000 });

    const [pending] = (await runDbsSql(
      page,
      `SELECT oauth_request_id, oauth->>'redirectUri' AS redirect_uri,
        (SELECT enabled FROM mcp_servers WHERE name = 'mock') AS enabled,
        (SELECT count(*)::int FROM mcp_server_tools WHERE server_name = 'mock') AS tool_count
      FROM mcp_server_configs WHERE id = $1`,
      [config.id],
      { returnType: "rows" },
    )) as {
      oauth_request_id: string;
      redirect_uri: string;
      enabled: boolean;
      tool_count: number;
    }[];
    expect(pending).toMatchObject({
      enabled: true,
      tool_count: 1,
      redirect_uri: config.oauth.redirectUri,
    });
    expect(pending?.oauth_request_id).not.toBe(config.oauth_request_id);
    await page.getByRole("button", { name: "Reconnect", exact: true }).click();
    const authorizationLink = page.getByTestId(
      "McpServerOAuthConfigAuthorizeUrlBtn.OpenAuthorizationUrl",
    );
    await expect(authorizationLink).toBeVisible();
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      authorizationLink.click(),
    ]);
    await completeMcpConsent(popup);
    await expect(page.getByTestId("MCPServerConfig")).toHaveCount(0, {
      timeout: 20_000,
    });
    expect((await getConfig()).id).toBe(config.id);
    await expect(
      page.getByText("mock needs authentication", { exact: true }),
    ).toHaveCount(0);
    expect(await reloadTools()).toBe(1);
    await page.goto(`${appOrigin}/server-settings?section=mcpServers`);
  });
};

export const completeMcpConsent = async (popup: Page) => {
  const consent = popup.locator("button[name=accept]");
  const username = popup.locator("#username");
  await expect
    .poll(
      async () =>
        popup.isClosed() ||
        (await username.isVisible().catch(() => false)) ||
        (await consent.isVisible().catch(() => false)),
      { timeout: 20_000 },
    )
    .toBe(true);
  if (!popup.isClosed() && (await username.isVisible())) {
    await username.fill("admin1");
    await popup.locator("#password").fill("admin1");
    await popup.locator("button[name=login]").click();
  }
  await expect
    .poll(
      async () =>
        popup.isClosed() || (await consent.isVisible().catch(() => false)),
      { timeout: 20_000 },
    )
    .toBe(true);
  if (!popup.isClosed()) await consent.click();
};
