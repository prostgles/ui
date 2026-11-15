import { execSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { getFreePort } from "@src/utils/isPortFree";
import {
  createTestDeployment,
  type TestDeployment,
} from "../../../server/dist/server/src/testing";
import { ROOT_DIR } from "../svgScreenshots/utils/constants";
import {
  completeMcpConsent,
  testRemoteMcpRecovery,
} from "../testAskLLM/testRemoteMcpRecovery";
import { getCommandElemSelector, getDataKey } from "../utils/Testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import {
  monacoType,
  runDbsMethod,
  runDbsSql,
  TWENTY_SECONDS_OR_MORE,
} from "../utils/utils";
import { expect, test } from "./fixtures";

test("Remote MCP server", async ({ page }) => {
  test.skip(!!process.env.ONLY_VIDEO, "Only recording videos");
  let deployment: TestDeployment | undefined;
  const imageName = "mcp-keycloak";
  const containerName = `mcp-keycloak-e2e-${randomUUID()}`;

  execSync(
    `docker build -t ${imageName} ./e2e/tests/testAskLLM/mockRemoteMcp`,
    { cwd: ROOT_DIR, stdio: "inherit" },
  );

  const [mcpPort, keycloakPort] = await Promise.all([
    getFreePort(),
    getFreePort(),
  ]);
  const mcpOrigin = `http://localhost:${mcpPort}`;
  const keycloakOrigin = `http://localhost:${keycloakPort}`;
  const container = spawn(
    "docker",
    [
      "run",
      "--rm",
      "--name",
      containerName,
      "-p",
      `${keycloakPort}:8080`,
      "-p",
      `${mcpPort}:3000`,
      "-e",
      `MCP_ORIGIN=${mcpOrigin}`,
      "-e",
      `KC_HOSTNAME=${keycloakOrigin}`,
      imageName,
    ],
    { cwd: process.cwd(), stdio: "inherit" },
  );
  try {
    test.setTimeout(4 * 60_000);

    await expect
      .poll(
        async () => {
          try {
            const ready = await Promise.all([
              page.request.get(
                `${mcpOrigin}/.well-known/oauth-protected-resource/mcp`,
              ),
              page.request.get(
                `${keycloakOrigin}/.well-known/oauth-authorization-server/realms/mcp`,
              ),
            ]);

            return ready.every((response) => response.status() === 200);
          } catch {
            return false;
          }
        },
        {
          timeout: 2 * 60_000,
          intervals: [500, 1_000, 2_000],
        },
      )
      .toBe(true);
    const configId = "remote-mcp-e2e";
    deployment = await createTestDeployment({
      configId,
      configPath: createConfigTestProject({ id: configId, tableConfig: {} }),
      logPath: test.info().outputPath("remote-mcp-server.log"),
    });
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(
      `${deployment.endpoint}/server-settings?section=mcpServers`,
    );

    await page.getByTestId("AddMCPServer.Open").click();
    await monacoType(
      page,
      ".SmartCodeEditor",
      JSON.stringify(
        {
          mcpServers: {
            mock: { url: `${mcpOrigin}/mcp` },
          },
        },
        null,
        2,
      ),
      { deleteAllAndFill: true, pressAfterTyping: ["Backspace"] },
    );

    await page.getByTestId("AddMCPServer.Add").click();
    await page.getByTestId("AddMCPServer.Add").waitFor({ state: "detached" });

    const serverCard = page
      .getByTestId("SmartCardList")
      .locator(getDataKey("mock"));
    await serverCard.getByTitle("Press to enable").click();

    /* OAuth authorization must not log errors, disable the server, or create alerts. */
    const expectNoAuthorizationErrors = async () => {
      expect(
        await runDbsSql(
          page,
          `SELECT enabled,
            (SELECT count(*)::int FROM mcp_server_logs WHERE server_name = 'mock') AS log_count,
            (SELECT count(*)::int FROM alerts WHERE title = 'mock MCP server disabled due to error') AS alert_count
          FROM mcp_servers WHERE name = 'mock'`,
          undefined,
          { returnType: "rows" },
        ),
      ).toEqual([{ enabled: true, log_count: 0, alert_count: 0 }]);
    };

    /** General info */
    await expect(
      page.getByTestId("McpServerOAuthConfigTopControls.ShowServerInfo"),
    ).toHaveAttribute("title", "Show server info", { ignoreCase: false });
    await page
      .getByTestId("McpServerOAuthConfigTopControls.ShowServerInfo")
      .click();
    await expect(page.getByTestId("Popup.content").last()).toContainText(
      "authorization_endpoint",
    );
    await page.getByTestId("Popup.close").last().click();

    /** DCR */
    await page
      .getByTestId("McpServerOAuthConfigActions.LoginWithOAuth")
      .click(TWENTY_SECONDS_OR_MORE);
    const authorizationLink = page.getByTestId(
      "McpServerOAuthConfigAuthorizeUrlBtn.OpenAuthorizationUrl",
    );
    await expect(authorizationLink).toBeVisible(TWENTY_SECONDS_OR_MORE);
    await expectNoAuthorizationErrors();
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      authorizationLink.click(),
    ]);
    await popup.waitForLoadState("load");
    await completeMcpConsent(popup);

    const saveConfigAndRefreshToolsAndDeleteConfig = async (
      testRecovery = false,
    ) => {
      await expect(
        page.getByTestId("McpServerOAuthConfigActions.connectionToggle"),
      ).toHaveText("Connected", { ...TWENTY_SECONDS_OR_MORE });
      await expectNoAuthorizationErrors();
      await page.getByTestId("MCPServerConfig.save").click();
      await page.waitForTimeout(1e3);
      if (testRecovery) {
        await testRemoteMcpRecovery(page, mcpOrigin, keycloakOrigin);
      }
      await page
        .locator(
          getDataKey("mock") +
            " " +
            getCommandElemSelector("MCPServerFooterActions.refreshTools"),
        )
        .click(TWENTY_SECONDS_OR_MORE);
      await expect(page.getByTestId("Popup.content").last()).toContainText(
        ` tool for "mock" server`,
        TWENTY_SECONDS_OR_MORE,
      );
      await page.getByText("OK", { exact: true }).click();
      await page
        .locator(
          getDataKey("mock") +
            " " +
            getCommandElemSelector("MCPServerConfigButton"),
        )
        .click();
      await page.getByText("Delete config", { exact: true }).click();
    };
    await saveConfigAndRefreshToolsAndDeleteConfig(true);

    const enableServer = async () => {
      await page.waitForTimeout(3e3);
      await page
        .locator(
          getDataKey("mock") + " " + getCommandElemSelector("SwitchToggle"),
        )
        .click();
    };

    const setAuthMode = async (
      mode: "bearer" | "client_credentials" | "authorization_code" | "cimd",
    ) => {
      await page
        .getByTestId("McpServerOAuthConfigTopControls.authMode")
        .click();
      await page
        .getByTestId("McpServerOAuthConfigTopControls.authMode")
        .locator(getDataKey(mode))
        .click();
    };

    /** Bearer */
    await enableServer();
    await setAuthMode("bearer");
    await page.getByLabel("Bearer token").fill("test-token");
    await page
      .getByTestId("McpServerOAuthConfigActions.LoginWithOAuth")
      .click();
    await saveConfigAndRefreshToolsAndDeleteConfig();

    /** authorization_code */
    await enableServer();
    await setAuthMode("authorization_code");
    await page.getByLabel("Client Id").fill("static-client");
    await page.getByLabel("Client Secret").fill("static-secret");
    await page
      .getByTestId("McpServerOAuthConfigActions.LoginWithOAuth")
      .click();

    await expect(authorizationLink).toHaveAttribute(
      "href",
      /[?&]client_id=static-client&/,
      TWENTY_SECONDS_OR_MORE,
    );
    const [popup2] = await Promise.all([
      page.waitForEvent("popup"),
      authorizationLink.click(),
    ]);
    await popup2.waitForLoadState("load");
    await completeMcpConsent(popup2);
    await saveConfigAndRefreshToolsAndDeleteConfig();

    /** client credentials */
    await enableServer();
    await setAuthMode("client_credentials");
    await page.getByLabel("Client Id").fill("static-client");
    await page.getByLabel("Client Secret").fill("static-secret");
    await page
      .getByTestId("McpServerOAuthConfigActions.LoginWithOAuth")
      .click();
    await expect(
      page.getByTestId("McpServerOAuthConfigActions.connectionToggle"),
    ).toHaveText("Connected", TWENTY_SECONDS_OR_MORE);
    /* Client credentials must renew without interactive authorization. */
    expect(
      await runDbsMethod(page, "reloadMcpServerTools", {
        serverName: "mock",
      }),
    ).toBe(1);
    await page.request.post(`${mcpOrigin}/test/expire-access-tokens`);
    expect(
      await runDbsMethod(page, "reloadMcpServerTools", {
        serverName: "mock",
      }),
    ).toBe(1);
    await saveConfigAndRefreshToolsAndDeleteConfig();

    /* TODO: CIMD
    await enableServer();
    await setAuthMode("cimd");
    const redirectUri = await page
      .locator(`[data-label="Redirect URL"] .input-wrapper`)
      .textContent();
    if (!redirectUri) throw new Error("Redirect URI not found");
    const searchParams = new URLSearchParams({ redirectUri });
    await fetch(
      "http://localhost:3000/set_redirect_uri_for_test?" +
        searchParams.toString(),
    );
    await page
      .getByLabel("Client metadata URL")
      .fill("http://localhost:3000/metadata.json");
    await saveConfigAndRefreshToolsAndDeleteConfig();
    */
  } finally {
    try {
      await deployment?.dispose();
    } finally {
      execSync(`docker rm -f ${containerName}`, { stdio: "ignore" });
      container.kill("SIGTERM");
    }
  }
});
