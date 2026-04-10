import { expect } from "@playwright/test";
import { getCommandElemSelector, getDataKey, getDataLabel } from "Testing";
import { createReceipt, DEMO_DIR } from "testAskLLM/createReceipt";
import { receiptImport } from "testAskLLM/scenarios/receiptImport/receiptImport.scenario";
import { updateAskLLMToolUseCode } from "testAskLLM/testAskLLM";
import {
  closeWorkspaceWindows,
  deleteExistingLLMChat,
  newChat,
  runDbSql,
  runDbsSql,
  setModelByText,
  setPromptByText,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { typeSendAddScenes } from "./utils/typeSendAddScenes";
import { fileBrowserGoToPath } from "fileBrowserGoToPath";

export const aiAssistantSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection },
  { addScene, addSceneAnimation },
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
  await updateAskLLMToolUseCode(page);
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
  await addSceneAnimation(getCommandElemSelector("AskLLM"));

  await setModelByText(page, "sonn");
  await setPromptByText(page, "dashboard");
  const deletePreviousMessages = async () => {
    const firstMessage = await page.getByTestId("AskLLM.DeleteMessage").first();
    if (await firstMessage.count()) {
      await firstMessage.click();
      await page.locator(getDataKey("allToBottom")).click();
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

      DROP TABLE IF EXISTS receipts;
      CREATE TABLE receipts (
        id BIGSERIAL PRIMARY KEY,
        receipt_number text,
        vendor_name text NOT NULL,
        purchase_date date NOT NULL,
        currency_code bpchar(3) NOT NULL DEFAULT 'USD'::bpchar,
        subtotal numeric(12, 2) NOT NULL,
        tax_amount numeric(12, 2) NOT NULL DEFAULT 0,
        total_amount numeric(12, 2) NOT NULL,
        payment_method text,
        notes text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT receipts_totals_check CHECK ((total_amount >= subtotal)),
        CONSTRAINT receipts_total_amount_check CHECK ((total_amount >= (0)::numeric)),
        CONSTRAINT receipts_tax_amount_check CHECK ((tax_amount >= (0)::numeric)),
        CONSTRAINT receipts_subtotal_check CHECK ((subtotal >= (0)::numeric))
      )
      `,
  );
  await page.getByTestId("AskLLM").click();
  await newChat(page);
  await deletePreviousMessages();
  await setPromptByText(page, "chat");
  await setModelByText(page, "sonn");

  await deletePreviousMessages();
  await setPromptByText(page, "Create workflow");
  const { filePath } = await createReceipt(page);

  await typeSendAddScenes(page, addScene, receiptImport.firstMessage);

  await addSceneAnimation(getDataKey("Insert automatically without preview"));
  await addSceneAnimation(
    getDataKey(
      "Skip likely duplicates (vendor + date + total + receipt_number)",
    ),
  );
  await addSceneAnimation(
    getDataKey("Skip that file and report it (recommended)"),
  );

  await addSceneAnimation(getCommandElemSelector("AskUserQuestions.confirm"));

  await runDbsSql(
    page,
    `
    UPDATE users 
    SET options = options || '{"lastCwd": ${JSON.stringify(DEMO_DIR)} }'::JSONB`,
  );

  await page.locator(getDataKey("sourcePaths")).click({ timeout: 35000 });
  await fileBrowserGoToPath(page.getByTestId("FileTree"), [
    "Documents",
    "Receipts",
  ]);
  await page.getByText("Done", { exact: true }).click();
  const startWorkflow = await page.getByTestId("AgenticWorkflow.start").last();
  await startWorkflow.waitFor({ state: "visible", timeout: 25000 });
  await startWorkflow.click();
  await page.waitForTimeout(5500);
  await addSceneAnimation(getDataKey("Activity"));
  await page.waitForTimeout(5500);
  await addSceneAnimation(getDataKey("Definition"));
  await page.waitForTimeout(5500);
  await addSceneAnimation(getDataKey("Logs"));

  await deletePreviousMessages();
  await setPromptByText(page, "chat");
  await typeSendAddScenes(
    page,
    addScene,
    "The task involves importing data from receipt images I will paste in this chat",
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

  await deletePreviousMessages();
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

  await page.getByTestId("Popup.close").last().click();
  await deleteExistingLLMChat(page);
  await page.getByTestId("LLMChatOptions.DatabaseAccess").click();
  await page.getByTestId("DatabaseAccessEditor.Mode").click();

  await page
    .getByTestId("DatabaseAccessEditor.Mode")
    .locator(getDataLabel("Run readonly SQL"))
    .click();
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
  await page.waitForTimeout(2000);
  await addScene({ svgFileName: "sql_result" });

  await deletePreviousMessages();
  await addSceneAnimation(getCommandElemSelector("Chat.speech"), "rightClick");
  await addSceneAnimation(getDataKey("stt-local"));
  await addScene({ svgFileName: "stt" });
  await page.keyboard.press("Escape");

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
};
