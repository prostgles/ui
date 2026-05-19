import { expect } from "@playwright/test";
import { getCommandElemSelector, getDataKey, getDataLabel } from "Testing";
import { createReceipts } from "testAskLLM/createReceipts";
import { geoQuestionScenario } from "testAskLLM/scenarios/geoQuestion.scenario";
import { setupAskLLMToolUse } from "testAskLLM/testAskLLM";
import {
  allowOnce,
  closeWorkspaceWindows,
  deleteExistingLLMChat,
  deletePreviousMessages,
  newChat,
  setPromptByText,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { typeSendAddScenes } from "./utils/typeSendAddScenes";

export const aiAssistantSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection },
  { addScene, addSceneAnimation },
) => {
  // throw new Error("DWA");
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
  await setupAskLLMToolUse(page);
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
  // await addSceneAnimation(getCommandElemSelector("AskLLM"));

  // await newChat(page);
  // await setModelByText(page, "sonn");
  // await setPromptByText(page, "dashboard");
  // await addScene({
  //   svgFileName: "focus_textarea",
  //   animations: [
  //     { type: "wait", duration: 1000 },
  //     {
  //       type: "click",
  //       elementSelector: getCommandElemSelector("Chat.textarea"),
  //       offset: { x: 20, y: 10 },
  //       duration: 1e3,
  //     },
  //   ],
  // });

  await openConnection("crypto");
  await page.getByTestId("AskLLM").click();
  await newChat(page);
  await setPromptByText(page, "dashboard");

  await typeSendAddScenes(
    page,
    addScene,
    "I need to look at futures and funding rates data across top coins",
  );
  await addSceneAnimation(
    getCommandElemSelector("AskLLMChat.LoadSuggestedDashboards"),
  );
  await addScene({ svgFileName: "crypto_dashboards" });
  await page.mouse.move(450, 300);
  await page.mouse.click(450, 300);
  await addScene({ svgFileName: "crypto_dashboards_tooltip" });

  await openConnection("cloud");
  await page.getByTestId("AskLLM").click();
  await newChat(page);
  await setPromptByText(page, "chat");
  await typeSendAddScenes(
    page,
    addScene,
    "The task involves importing data from receipt images I will paste in this chat",
    undefined,
    undefined,
    undefined,
    "request_tool_access",
  );
  const loadToolsBtn = await page
    .getByTestId("RequestToolAccess.Approve")
    .last();

  await loadToolsBtn.waitFor({ state: "visible", timeout: 15000 });

  await addSceneAnimation(getCommandElemSelector("RequestToolAccess.Approve"));

  await page.getByText("Added tool access").waitFor({ state: "visible" });
  await page.waitForTimeout(1000);
  await addScene({
    svgFileName: "tasks",
    animations: [{ type: "wait", duration: 1000 }],
  });
  const { filePath } = await createReceipts(page, true);
  await page.waitForTimeout(4000);
  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByTestId("Chat.addFiles").click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);

  await typeSendAddScenes(page, addScene, ``);

  await page.waitForTimeout(2000);
  await addScene({
    svgFileName: "vision_ocr",
    animations: [{ type: "wait", duration: 1000 }],
  });

  await page.getByTestId("AskLLMToolApprover.AllowOnce").last().click();
  await page.getByTestId("ToolUseMessage.toggle").last().click();
  await expect(page.getByTestId("Popup.content").last()).toContainText(
    "Grand Ocean Hotel",
  );

  await deletePreviousMessages(page);
  await page.waitForTimeout(1000);
  await setPromptByText(page, "chat");
  await page.getByTestId("LLMChatOptions.MCPTools").click();
  await page
    .getByTestId("MCPServerTools")
    .getByText("run_code_in_sandbox")
    .click();

  await page.waitForTimeout(1000);
  await page.getByText("Auto-approve: ON").scrollIntoViewIfNeeded();
  await page.getByText("Auto-approve: ON").click();
  await page.getByText("Auto-approve: OFF").click(); // Auto-approve
  await page.waitForTimeout(1000);
  await page.getByTestId("Popup.close").last().click();

  await typeSendAddScenes(
    page,
    addScene,
    "Upload some weather data for London for the last 4 years",
    [{ type: "wait", duration: 1000 }],
  );
  await page.waitForTimeout(2500);
  await expect(page.getByTestId("ToolUseMessage").last()).toContainText(
    "Fetching data from",
  );

  await addSceneAnimation(getDataKey("fetch_weather.js"));

  await addScene({
    svgFileName: "docker",
    animations: [{ type: "wait", duration: 1000 }],
  });

  await newChat(page);
  await page.getByTestId("LLMChatOptions.DatabaseAccess").click();
  await page.getByTestId("DatabaseAccessEditor.Mode").click();

  await page
    .getByTestId("DatabaseAccessEditor.Mode")
    .locator(getDataLabel("Run readonly SQL"))
    .click();
  await page.getByTestId("Popup.close").last().click();

  await openConnection("food_delivery");
  await page.getByTestId("AskLLM").click();
  await setPromptByText(page, "chat");
  await newChat(page);

  await typeSendAddScenes(
    page,
    addScene,
    geoQuestionScenario.firstMessage,
    [
      { type: "wait", duration: 1000 },
      {
        type: "click",
        elementSelector: getCommandElemSelector("AskLLMToolApprover.AllowOnce"),
        duration: 1000,
      },
    ],
    () => allowOnce(page, false),
    undefined,
    "geo_question",
  );
  await allowOnce(page);
  await page.getByTestId("ToolUseMessage.toggleGroup").last().click();
  await page.getByTestId("ToolUseMessage.toggle").last().click();
  await expect(page.getByTestId("MarkdownMonacoCode").last()).toContainText(
    "WITH o30 AS (  SELECT o.id",
  );
  await page.waitForTimeout(2000);
  await addScene({ svgFileName: "sql_result" });

  await deletePreviousMessages(page);
  await addSceneAnimation(getCommandElemSelector("Chat.speech"), {
    action: "rightClick",
  });
  await addSceneAnimation(getDataKey("stt-local"));
  await addScene({ svgFileName: "stt" });
  await page.keyboard.press("Escape");
};
