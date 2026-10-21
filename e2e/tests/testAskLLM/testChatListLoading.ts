import type { Page } from "@playwright/test";
import { createTestDeployment } from "../../../server/dist/server/src/testing";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import { expect, test } from "../utils/fixtures";

export const testChatListLoading = async (page: Page) => {
  const configId = "chat-list-loading-e2e";
  const deployment = await createTestDeployment({
    configId,
    configPath: createConfigTestProject({ id: configId, tableConfig: {} }),
    logPath: test.info().outputPath("chat-list-loading-server.log"),
    seed: async ({ stateDatabase }) => {
      await stateDatabase.query(`
        INSERT INTO llm_credentials (provider_id, user_id, api_key)
        SELECT 'OpenRouter', id, 'test-key' FROM users WHERE username = 'admin';
        INSERT INTO llm_chats (name, user_id, connection_id, model, llm_prompt_id)
        SELECT chats.name, users.id, connections.id,
          (SELECT id FROM llm_models WHERE provider_id = 'OpenRouter' LIMIT 1),
          (SELECT id FROM llm_prompts WHERE name = 'Empty' LIMIT 1)
        FROM users, connections, (VALUES ('Idle chat'), ('Background chat')) AS chats(name)
        WHERE users.username = 'admin' AND connections.name = '${configId}';
      `);
    },
  });
  try {
    const { db } = await deployment.connectStateAs("admin");
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    await page.goto(deployment.dashboardUrl);
    await page.getByTestId("AskLLM").click();
    await page.getByTestId("LLMChat.select").click();
    const chatList = page.getByTestId("LLMChat.select");
    const idleChat = chatList.getByRole("option", { name: "Idle chat" });
    const backgroundChat = chatList.getByRole("option", {
      name: "Background chat",
    });
    await idleChat.click();
    await page.getByTestId("LLMChat.select").click();
    await expect(chatList.getByTestId("Loading")).toHaveCount(0);

    await db.llm_chats!.update(
      { name: "Background chat" },
      { status: { state: "loading", since: new Date().toISOString() } },
    );
    await expect(backgroundChat.getByTestId("Loading")).toBeVisible();
    await expect(idleChat.getByTestId("Loading")).toHaveCount(0);
    await backgroundChat.click();
    await expect(page.getByTestId("Chat.textarea")).toBeDisabled();
    await page.getByTestId("LLMChat.select").click();
    await expect(backgroundChat.getByTestId("Loading")).toBeVisible();

    await db.llm_chats!.update({ name: "Background chat" }, { status: null });
    await expect(backgroundChat.getByTestId("Loading")).toHaveCount(0);
    await db.llm_chats!.update(
      { name: "Background chat" },
      { status: { state: "loading", since: new Date().toISOString() } },
    );
    await expect(backgroundChat.getByTestId("Loading")).toBeVisible();
    await db.llm_chats!.update(
      { name: "Background chat" },
      {
        status: {
          state: "stopped",
          reason: "manual",
          timestamp: new Date().toISOString(),
        },
      },
    );
    await expect(backgroundChat.getByTestId("Loading")).toHaveCount(0);
  } finally {
    await deployment.dispose();
  }
};
