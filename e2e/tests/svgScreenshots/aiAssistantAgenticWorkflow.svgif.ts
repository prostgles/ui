import { getCommandElemSelector, getDataKey, getDataLabel } from "Testing";
import { createReceipts, DEMO_DIR } from "testAskLLM/createReceipts";
import { receiptImport } from "testAskLLM/scenarios/receiptImport/receiptImport.scenario";
import { setupAskLLMToolUse } from "testAskLLM/testAskLLM";
import {
  closeWorkspaceWindows,
  deletePreviousMessages,
  newChat,
  runDbSql,
  runDbsSql,
  setModelByText,
  setPromptByText,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { typeSendAddScenes } from "./utils/typeSendAddScenes";
import { join } from "path";

export const aiAssistantAgenticWorkflowSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection },
  { addScene, addSceneAnimation },
) => {
  await openConnection("prostgles_video_demo");
  await closeWorkspaceWindows(page);
  const disposable = await page.screencast.start({
    path: join(DEMO_DIR, "demvid.webm"),
    quality: 100,
    size: { width: 900, height: 900 },
  });
  await page.getByTestId("AskLLM").click();
  await page.waitForTimeout(1000);
  await setupAskLLMToolUse(page);

  await runDbsSql(
    page,
    `
    UPDATE users 
    SET options = options || '{"lastCwd": ${JSON.stringify(DEMO_DIR)} }'::JSONB`,
  );
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
  await newChat(page);
  await deletePreviousMessages(page);
  await setPromptByText(page, "chat");
  await setModelByText(page, "sonn");

  await deletePreviousMessages(page);
  await setPromptByText(page, "Create workflow");
  await createReceipts(page);

  await typeSendAddScenes(
    page,
    addScene,
    receiptImport.firstMessage,
    undefined,
    undefined,
    1000,
  );
  // await addScene({ animations: [{ type: "wait", duration: 500 }] });
  await addSceneAnimation(
    getDataKey("Insert automatically without preview"),
    undefined,
    "fast",
  );
  await addSceneAnimation(
    getDataKey(
      "Skip likely duplicates (vendor + date + total + receipt_number)",
    ),
    undefined,
    "fast",
  );
  await addSceneAnimation(
    getDataKey("Skip that file and report it (recommended)"),
    undefined,
    "fast",
  );

  await addSceneAnimation(
    getCommandElemSelector("AskUserQuestions.confirm"),
    undefined,
    "fast",
  );
  await addScene({ animations: [{ type: "wait", duration: 500 }] });

  await page
    .locator(getDataKey("sourcePaths"))
    .waitFor({ state: "visible", timeout: 35000 });

  await page.getByTestId("FullscreenWrapper.toggleFullscreen").first().click();
  await addSceneAnimation(getDataKey("Definition"));
  await addSceneAnimation(getDataKey("Details"));
  await page.keyboard.press("Escape");

  await addSceneAnimation(getDataKey("sourcePaths"), undefined, "fast");

  // await fileBrowserGoToPath(
  //   page.getByTestId("FileTree"),
  //   ["Documents", "Receipts"],
  //   async (selector) => {
  //     await addSceneAnimation(selector, undefined, "fast");
  //   },
  // );

  await addSceneAnimation(
    `${getCommandElemSelector("FileTree")} ${getDataLabel("Documents")}`,
    undefined,
    "fast",
  );
  await addSceneAnimation(
    `${getCommandElemSelector("FileTree")} ${getDataLabel("Receipts")}`,
    undefined,
    "fast",
  );
  await addSceneAnimation(
    `${getCommandElemSelector("FileTree")} ${getDataLabel("Receipts")} ${getCommandElemSelector("FileTreeNode.folderRow")} ${getCommandElemSelector("FileTreeNode.checkbox")}`,
    undefined,
    "fast",
  );

  await addSceneAnimation(
    getCommandElemSelector("UserInput.Done"),
    undefined,
    "fast",
  );

  await addSceneAnimation(
    getCommandElemSelector("AgenticWorkflow.start"),
    undefined,
    "fast",
  );
  await addScene({ animations: [{ type: "wait", duration: 1000 }] });
  // await page.waitForTimeout(5500);
  await addSceneAnimation(getDataKey("Activity"));
  await addScene({ animations: [{ type: "wait", duration: 1000 }] });
  await addSceneAnimation({
    selector: getDataLabel("documents get_document_text"),
    nth: 1,
  });
  await addSceneAnimation(
    {
      selector: getCommandElemSelector("Popup.close"),
      nth: 2,
    },
    undefined,
    "fast",
  );
  await addSceneAnimation({
    selector: getDataLabel("receiptExtractor"),
    nth: 1,
  });
  await addSceneAnimation(
    {
      selector: getCommandElemSelector("Popup.close"),
      nth: 2,
    },
    undefined,
    "fast",
  );
  // await page.waitForTimeout(5500);
  await addSceneAnimation(getDataKey("Logs"));
  await page.waitForTimeout(5500);
  await addScene({ animations: [{ type: "wait", duration: 4500 }] });
  await disposable.dispose();
};
