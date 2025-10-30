import { expect } from "@playwright/test";
import {
  getCommandElemSelector,
  getDataKeyElemSelector,
  type SVGif,
} from "Testing";
import { createReceipt } from "createReceipt";
import {
  closeWorkspaceWindows,
  deleteExistingLLMChat,
  runDbSql,
  setModelByText,
  setPromptByText,
  type PageWIds,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";

export const aiAssistantSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection },
  { addScene, addSceneWithClickAnimation },
) => {
  // await goTo(page, "/server-settings?section=llmProviders");
  // await page.getByTestId("dashboard.window.rowInsertTop").click();
  // await page.getByTestId("Popup.content").waitFor({ state: "visible" });
  // await page.waitForTimeout(1500);
  // await page.keyboard.press("Enter");
  // await page.waitForTimeout(1500);

  // await addScene({
  //   svgFileName: "supported_providers",
  //   caption: "Supported providers",
  // });
  await openConnection("food_delivery");
  await page.getByTestId("AskLLM").click();
  await page.waitForTimeout(1000);
  const UnloadSuggestedDashboards = await page.getByTestId(
    "AskLLMChat.UnloadSuggestedDashboards",
  );
  if (await UnloadSuggestedDashboards.count()) {
    await UnloadSuggestedDashboards.click();
    await page.waitForTimeout(1000);
  } else {
    await page.getByTestId("Popup.close").last().click();
  }
  await deleteExistingLLMChat(page);
  await page.getByTestId("Popup.close").last().click();
  await closeWorkspaceWindows(page);
  await addSceneWithClickAnimation(getCommandElemSelector("AskLLM"));

  await setModelByText(page, "pros");
  await setPromptByText(page, "dashboard");
  const deletePreviousMessages = async () => {
    const firstMessage = await page.getByTestId("AskLLM.DeleteMessage").first();
    if (await firstMessage.count()) {
      await firstMessage.click();
      await page.locator(getDataKeyElemSelector("allToBottom")).click();
    }
  };
  await addScene({
    svgFileName: "focus_textarea",
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getCommandElemSelector("Chat.textarea"),
        offset: { x: 20, y: 10 },
        duration: 1e3,
      },
    ],
  });

  await typeSendAddScenes(
    page,
    addScene,
    "I need some dashboards with useful insights and metrics",
    [
      {
        type: "click",
        elementSelector: getCommandElemSelector(
          "AskLLMChat.LoadSuggestedDashboards",
        ),
        duration: 1000,
      },
    ],
  );
  await page.getByTestId("AskLLMChat.LoadSuggestedDashboards").click();
  await page.waitForTimeout(4000);
  await addScene({ svgFileName: "dashboards_loaded" });

  await page.getByTestId("AskLLM").click();
  await page.getByTestId("AskLLMChat.UnloadSuggestedDashboards").click();

  await openConnection("prostgles_video_demo");
  await closeWorkspaceWindows(page);
  await runDbSql(
    page,
    `
      CREATE TABLE IF NOT EXISTS receipts (
        id SERIAL PRIMARY KEY,
        company TEXT,
        extracted_text TEXT,
        amount NUMERIC,
        currency TEXT,
        date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      `,
  );
  await page.getByTestId("AskLLM").click();
  await deletePreviousMessages();
  await setPromptByText(page, "chat");
  await setModelByText(page, "pros");

  await deletePreviousMessages();
  await setPromptByText(page, "create task");
  await typeSendAddScenes(
    page,
    addScene,
    "The task involves importing data from scanned receipts",
  );
  const loadTaskBtn = await page
    .getByTestId("AskLLMChat.LoadSuggestedToolsAndPrompt")
    .last();

  await loadTaskBtn.waitFor({ state: "visible", timeout: 15000 });
  await addSceneWithClickAnimation(
    getCommandElemSelector("AskLLMChat.LoadSuggestedToolsAndPrompt"),
  );

  await page.getByTestId("Alert").getByText("OK").waitFor({ state: "visible" });
  await page.waitForTimeout(1000);
  await addScene({ svgFileName: "tasks" });
  await page.getByTestId("Alert").getByText("OK").click();
  await page.waitForTimeout(4000);
  const { filePath } = await createReceipt(page);
  await page.getByTestId("Chat.addFiles").setInputFiles(filePath);

  await typeSendAddScenes(
    page,
    addScene,
    `Here is a scanned receipt `,
    //   [
    //   { type: "wait", duration: 500 },
    //   {
    //     type: "click",
    //     elementSelector:
    //       getCommandElemSelector("ToolUseMessage.toggle") + ":last-child",
    //     duration: 1000,
    //   },
    // ]
  );

  await page.waitForTimeout(2000);
  await addScene({ svgFileName: "vision_ocr" });

  await page.getByTestId("ToolUseMessage.toggle").last().click();
  await expect(page.getByTestId("Popup.content").last()).toContainText(
    "Grand Ocean Hotel",
  );

  await deletePreviousMessages();
  await setPromptByText(page, "chat");
  await page.getByTestId("LLMChatOptions.MCPTools").click();
  await page
    .getByTestId("MCPServerTools")
    .getByText("create_container")
    .click();
  await page.getByText("Auto-approve: ON").click();
  await page.waitForTimeout(1000);
  await page.getByText("Auto-approve: OFF").click();
  await page.waitForTimeout(1000);
  await page.getByTestId("Popup.close").last().click();

  await typeSendAddScenes(
    page,
    addScene,
    "Upload some weather data for London for the last 4 years",
    [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getCommandElemSelector("ToolUseMessage.toggle"),
        duration: 1000,
      },
    ],
  );
  await page.getByTestId("ToolUseMessage.toggle").last().click();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("ToolUseMessage").last()).toContainText(
    "Fetching data from",
  );

  await addSceneWithClickAnimation(getDataKeyElemSelector("fetch_weather.js"));

  await page.getByTestId("ToolUseMessage").last().scrollIntoViewIfNeeded();
  await addScene({
    svgFileName: "docker_js",
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getDataKeyElemSelector("fetch_weather.js"),
        duration: 1000,
      },
    ],
  });

  await addScene({ svgFileName: "docker" });

  await page.getByTestId("Popup.close").last().click();
  await deleteExistingLLMChat(page);
  await page.getByTestId("LLMChatOptions.DatabaseAccess").click();
  await page
    .getByTestId("Popup.content")
    .last()
    .getByLabel("Mode", { exact: true })
    .click();

  await page.getByRole("option", { name: "Run readonly SQL" }).click();
  await page.getByTestId("Popup.close").last().click();

  await setPromptByText(page, "chat");

  const allowOnce = async (doClick = true) => {
    const allowOnceBtn = await page
      .getByTestId("AskLLMToolApprover.AllowOnce")
      .last();
    await allowOnceBtn.waitFor({ state: "visible", timeout: 15000 });
    doClick && (await allowOnceBtn.click());
    await page.waitForTimeout(2500);
  };
  await typeSendAddScenes(
    page,
    addScene,
    "Show a list of orders from the last 30 days",
    [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getCommandElemSelector("AskLLMToolApprover.AllowOnce"),
        duration: 1000,
      },
    ],
    () => allowOnce(false),
  );
  await allowOnce();
  await page.getByTestId("ToolUseMessage.toggle").last().click();
  await expect(page.getByTestId("MarkdownMonacoCode").last()).toContainText(
    "SELECT * FROM orders",
  );
  await page.getByTestId("Popup.close").last().click();
  await addScene({ svgFileName: "sql" });
};

export const typeSendAddScenes = async (
  page: PageWIds,
  addScene: Parameters<OnBeforeScreenshot>[2]["addScene"],
  text: string,
  endAnimations: SVGif.Animation[] = [],
  waitFor?: () => Promise<void>,
) => {
  await page.getByTestId("Chat.textarea").fill(text);
  await page.waitForTimeout(1000);
  await addScene({
    animations: [
      {
        type: "type",
        elementSelector: getCommandElemSelector("Chat.textarea"),
        duration: 2000,
      },
      { type: "wait", duration: 500 },
    ],
  });
  await page.getByTestId("Chat.send").click();
  await page.waitForTimeout(2000);
  await addScene(); // LLM response loading
  const lastMessage = page
    .getByTestId("Chat.messageList")
    .locator(".message")
    .last();

  await expect(lastMessage).toContainClass("incoming", { timeout: 15000 });
  await waitFor?.();
  await addScene({
    animations: [
      {
        type: "fadeIn",
        duration: 2000,
        elementSelector:
          getCommandElemSelector("Chat.messageList") + " > g:last-of-type",
      },
      ...endAnimations,
    ],
  });
};
