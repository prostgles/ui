import {
  closeWorkspaceWindows,
  deleteExistingLLMChat,
  setModelByText,
  setPromptByText,
} from "utils/utils";
import {
  getCommandElemSelector,
  getDataKeyElemSelector,
  type SVGif,
} from "Testing";
import { createReceipt } from "createReceipt";
import { expect } from "@playwright/test";
import type { OnBeforeScreenshot } from "./utils/saveSVGs";
import { goTo } from "utils/goTo";

export const aiAssistantSVG: OnBeforeScreenshot = async (
  page,
  { openConnection },
  addScene,
) => {
  await goTo(page, "/server-settings?section=llmProviders");
  await page.getByTestId("dashboard.window.rowInsertTop").click();
  await page.keyboard.press("Enter");
  await page.evaluate(() => {
    // Remove Prostgles elem
    const prostglesElem = document.querySelector('[data-key="Prostgles"]');
    prostglesElem?.parentElement?.removeChild(prostglesElem);
  });
  await addScene({
    svgFileName: "supported_providers",
    caption: "Supported providers",
  });

  /**
   * This is required to initialize the askLLM function
   */
  await openConnection("cloud");
  await openConnection("prostgles_video_demo");
  await openConnection("food_delivery");
  await deleteExistingLLMChat(page);
  await page.getByTestId("Popup.close").last().click();
  await closeWorkspaceWindows(page);
  await addScene({
    svgFileName: "open_chat",
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getCommandElemSelector("AskLLM"),
        duration: 500,
      },
    ],
  });

  await page.getByTestId("AskLLM").click();
  await setModelByText(page, "pros");
  await setPromptByText(page, "dashboard");
  const deletePreviousMessages = async () => {
    const firstMessage = await page.getByTestId("AskLLM.DeleteMessage").first();
    if (await firstMessage.count()) {
      await firstMessage.click();
      await page.locator(getDataKeyElemSelector("allToBottom")).click();
    }
  };
  await deletePreviousMessages();
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

  const allowOnce = async (doClick = true) => {
    const allowOnceBtn = await page
      .getByTestId("AskLLMToolApprover.AllowOnce")
      .last();
    await allowOnceBtn.waitFor({ state: "visible", timeout: 15000 });
    doClick && (await allowOnceBtn.click());
    await page.waitForTimeout(2500);
  };
  const typeSendAddScenes = async (
    text: string,
    endAnimations: SVGif.Animation[] = [],
    waitFor?: () => Promise<void>,
  ) => {
    await page.getByTestId("Chat.textarea").fill(text);
    await page.waitForTimeout(500);
    await addScene({
      animations: [
        {
          type: "type",
          elementSelector: getCommandElemSelector("Chat.textarea"),
          duration: 2000,
        },
        { type: "wait", duration: 1000 },
      ],
    });
    await page.getByTestId("Chat.send").click();
    await page.waitForTimeout(2500);
    await waitFor?.();
    await addScene({
      animations: [
        {
          type: "reveal-list",
          duration: 2000,
          elementSelector: getCommandElemSelector("Chat.messageList"),
        },
        {
          type: "wait",
          duration: 3000,
        },
        ...endAnimations,
      ],
    });
  };
  await typeSendAddScenes(
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
  await page.waitForTimeout(2000);
  await addScene({ svgFileName: "dashboards_loaded" });

  await page.getByTestId("AskLLM").click();
  await page.getByTestId("AskLLMChat.UnloadSuggestedDashboards").click();

  await openConnection("prostgles_video_demo");
  await closeWorkspaceWindows(page);
  await page.getByTestId("AskLLM").click();
  await deletePreviousMessages();
  await setPromptByText(page, "chat");
  await typeSendAddScenes(" mcpplaywright ");
  await deletePreviousMessages();
  await setPromptByText(page, "create task");
  await typeSendAddScenes(
    "The task involves importing data from scanned documents",
  );
  const loadTaskBtn = await page
    .getByTestId("AskLLMChat.LoadSuggestedToolsAndPrompt")
    .last();

  await loadTaskBtn.waitFor({ state: "visible", timeout: 15000 });
  await addScene({
    animations: [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getCommandElemSelector(
          "AskLLMChat.LoadSuggestedToolsAndPrompt",
        ),
        duration: 1000,
      },
    ],
  });
  await loadTaskBtn.click();
  await page.getByTestId("Alert").getByText("OK").click();
  await page.waitForTimeout(4000);
  await addScene({ svgFileName: "tasks" });
  const { filePath } = await createReceipt(page);
  await page.getByTestId("Chat.addFiles").setInputFiles(filePath);

  await typeSendAddScenes(
    `Extract data from this receipt ${filePath}`,
    [
      { type: "wait", duration: 3000 },
      {
        type: "click",
        elementSelector: getCommandElemSelector("AskLLMToolApprover.AllowOnce"),
        duration: 1000,
      },
    ],
    () => allowOnce(false),
  );
  await expect(page.getByTestId("Popup.content").last()).toContainText(
    "Grand Ocean Hotel",
  );
  await allowOnce();
  await addScene({ svgFileName: "vision_ocr" });
  await deletePreviousMessages();
  await setPromptByText(page, "chat");
  await page.getByTestId("LLMChatOptions.MCPTools").click();
  await page
    .getByTestId("MCPServerTools")
    .getByText("create_container")
    .click();
  await page.getByText("Auto-approve: OFF").click();
  await page.getByTestId("Popup.close").last().click();

  await typeSendAddScenes(
    "Upload some historical weather data for London for the last 4 years",
  );
  await page.getByTestId("ToolUseMessage.toggle").last().click();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("ToolUseMessage.Popup").last()).toContainText(
    "Fetching data from",
  );
  await page.getByTestId("Popup.close").last().click();
  await addScene({ svgFileName: "docker" });
  await page.getByTestId("LLMChatOptions.DatabaseAccess").click();
  await page
    .getByTestId("Popup.content")
    .last()
    .getByLabel("Mode", { exact: true })
    .click();

  await page.getByRole("option", { name: "Run readonly SQL" }).click();
  await page.getByTestId("Popup.close").last().click();

  await deletePreviousMessages();
  await setPromptByText(page, "chat");
  // await page
  //   .getByTestId("Chat.textarea")
  //   .fill("Show a list of orders from the last 30 days");
  // await page.getByTestId("Chat.send").click();

  await typeSendAddScenes(
    "Show a list of orders from the last 30 days",
    [
      { type: "wait", duration: 3000 },
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
  await expect(page.getByTestId("ToolUseMessage.Popup").last()).toContainText(
    "SELECT * FROM orders",
  );
  await page.getByTestId("Popup.close").last().click();
  await addScene({ svgFileName: "sql" });
};
