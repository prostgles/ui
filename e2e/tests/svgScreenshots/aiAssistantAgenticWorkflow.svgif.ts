import { expect } from "@playwright/test";
import { getCommandElemSelector, getDataKey, getDataLabel } from "Testing";
import { createReceipt, DEMO_DIR } from "testAskLLM/createReceipt";
import { receiptImport } from "testAskLLM/scenarios/receiptImport/receiptImport.scenario";
import { setupAskLLMToolUse } from "testAskLLM/testAskLLM";
import {
  closeWorkspaceWindows,
  deleteExistingLLMChat,
  deletePreviousMessages,
  newChat,
  runDbSql,
  runDbsSql,
  setModelByText,
  setPromptByText,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { typeSendAddScenes } from "./utils/typeSendAddScenes";
import { fileBrowserGoToPath } from "fileBrowserGoToPath";

export const aiAssistantAgenticWorkflowSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection },
  { addScene, addSceneAnimation },
) => {
  await openConnection("prostgles_video_demo");
  await closeWorkspaceWindows(page);
  await page.getByTestId("AskLLM").click();
  await page.waitForTimeout(1000);
  await setupAskLLMToolUse(page);

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
  await deletePreviousMessages(page);
  await setPromptByText(page, "chat");
  await setModelByText(page, "sonn");

  await deletePreviousMessages(page);
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
};
