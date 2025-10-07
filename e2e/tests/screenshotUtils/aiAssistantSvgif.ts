import {
  deleteExistingLLMChat,
  setModelByText,
  setPromptByText,
} from "utils/utils";
import { getDataKeyElemSelector } from "Testing";
import { createReceipt } from "createReceipt";
import { expect } from "@playwright/test";
import type { OnBeforeScreenshot } from "./utils/saveSVGs";

export const aiAssistantSVG: OnBeforeScreenshot = async (
  page,
  { openConnection },
  addScene,
) => {
  /**
   * This is required to initialize the askLLM function
   */
  await openConnection("cloud");
  await openConnection("prostgles_video_demo");
  await deleteExistingLLMChat(page);
  // await page.getByTestId("AskLLM").click();
  await setModelByText(page, "pros");
  await setPromptByText(page, "dashboard");
  await addScene({ svgFileName: "empty" });
  const firstMessage = await page.getByTestId("AskLLM.DeleteMessage").first();
  if (await firstMessage.count()) {
    await firstMessage.click();
    await page.locator(getDataKeyElemSelector("allToBottom")).click();
  }
  await page
    .getByTestId("Chat.textarea")
    .fill("I need some dashboards with useful insights and metrics");
  await page.getByTestId("Chat.send").click();
  await page.waitForTimeout(2500);
  await addScene({ svgFileName: "dashboards" });
  await page.getByTestId("AskLLM.DeleteMessage").first().click();
  await page.locator(getDataKeyElemSelector("allToBottom")).click();
  await setPromptByText(page, "chat");
  await page.getByTestId("Chat.textarea").fill(" mcpplaywright ");
  await page.getByTestId("Chat.send").click();
  await page.waitForTimeout(2500);
  await addScene({ svgFileName: "mcp" });
  await page.getByTestId("AskLLM.DeleteMessage").first().click();
  await page.locator(getDataKeyElemSelector("allToBottom")).click();
  await setPromptByText(page, "create task");
  await page
    .getByTestId("Chat.textarea")
    .fill("The task involves importing data from scanned documents");
  await page.getByTestId("Chat.send").click();
  await page.waitForTimeout(2500);
  await page
    .getByTestId("AskLLMChat.LoadSuggestedToolsAndPrompt")
    .last()
    .click();
  await page.getByTestId("Alert").getByText("OK").click();
  await addScene({ svgFileName: "tasks" });
  const { filePath } = await createReceipt(page);
  await page
    .getByTestId("Chat.textarea")
    .fill(`Extract data from this receipt ${filePath}`);
  await page.getByTestId("Chat.addFiles").setInputFiles(filePath);
  await page.getByTestId("Chat.send").click();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("Popup.content").last()).toContainText(
    "Grand Ocean Hotel",
  );
  await page.getByText("Allow once").click();
  await addScene({ svgFileName: "vision_ocr" });
  await page.getByTestId("AskLLM.DeleteMessage").first().click();
  await page.locator(getDataKeyElemSelector("allToBottom")).click();
  await setPromptByText(page, "chat");
  await page.getByTestId("LLMChatOptions.MCPTools").click();
  await page
    .getByTestId("MCPServerTools")
    .getByText("create_container")
    .click();
  await page.getByText("Auto-approve: OFF").click();
  await page.getByTestId("Popup.close").last().click();
  await page
    .getByTestId("Chat.textarea")
    .fill(
      "Upload some historical weather data for London for the last 4 years",
    );
  await page.getByTestId("Chat.send").click();
  await page.waitForTimeout(2500);
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

  await page.getByTestId("AskLLM.DeleteMessage").first().click();
  await page.locator(getDataKeyElemSelector("allToBottom")).click();
  await setPromptByText(page, "chat");
  await page
    .getByTestId("Chat.textarea")
    .fill("Show a list of orders from the last 30 days");
  await page.getByTestId("Chat.send").click();
  await page.getByText("Allow once").click();
  await page.waitForTimeout(2500);
  await page.getByTestId("ToolUseMessage.toggle").last().click();
  await expect(page.getByTestId("ToolUseMessage.Popup").last()).toContainText(
    "SELECT * FROM orders",
  );
  await page.getByTestId("Popup.close").last().click();
  await addScene({ svgFileName: "sql" });
  // },
};
