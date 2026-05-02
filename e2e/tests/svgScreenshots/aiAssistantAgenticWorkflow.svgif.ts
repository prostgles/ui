import { getCommandElemSelector, getDataKey, getDataLabel } from "Testing";
import { createReceipts, DEMO_HOME_DIR } from "testAskLLM/createReceipts";
import { receiptImport } from "testAskLLM/scenarios/receiptImport/receiptImport.scenario";
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

export const aiAssistantAgenticWorkflowSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection },
  { addScene, addSceneAnimation },
) => {
  await openConnection("prostgles_video_demo");
  await closeWorkspaceWindows(page);

  await createReceipts(page);
  await runDbsSql(
    page,
    `
    UPDATE users 
    SET options = options || \${demo_options}`,
    {
      demo_options: {
        hideLlmLoadingCounter: true,
        lastCwd: DEMO_HOME_DIR,
      },
    },
  );
  /** Ensures user opts get updated.
   * TODO: check if overriding user in useProjectDb with the one form useAppState subscription breaks too many things  */
  await page.reload();

  await page.getByTestId("AskLLM").click();
  await page.waitForTimeout(1000);

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
      --  payment_method text,
      --  notes text,
      --  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
      --  updated_at timestamptz NOT NULL DEFAULT now(),
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

  await typeSendAddScenes(
    page,
    addScene,
    receiptImport.firstMessage,
    undefined,
    undefined,
    { LlmResponseLoadingDuration: 0 },
  );

  await addSceneAnimation(
    getDataKey("Insert automatically without preview"),
    undefined,
    "faster",
  );
  await addSceneAnimation(
    getDataKey(
      "Skip likely duplicates (vendor + date + total + receipt_number)",
    ),
    undefined,
    "faster",
  );
  await addSceneAnimation(
    getDataKey("Skip that file and report it (recommended)"),
    undefined,
    "faster",
  );

  await addSceneAnimation(
    getCommandElemSelector("AskUserQuestions.confirm"),
    undefined,
    "faster",
  );
  await addScene({ animations: [{ type: "wait", duration: 2000 }] });

  await page
    .locator(getDataKey("sourcePaths"))
    .waitFor({ state: "visible", timeout: 35000 });

  await addScene({
    animations: [
      {
        type: "wait",
        duration: 1000,
      },
    ],
  });

  await addSceneAnimation(
    {
      selector: getCommandElemSelector("FullscreenWrapper.toggleFullscreen"),
      nth: 0,
    },
    undefined,
    {
      waitBeforeClick: 200,
    },
  );
  await addScene({
    animations: [
      {
        type: "growIn",
        elementSelector: getCommandElemSelector("AgenticWorkflow"),
        duration: 150,
        startScale: 0.95,
      },
      {
        type: "fadeIn",
        elementSelector: getCommandElemSelector(
          "AgenticWorkflowDetails.description",
        ),
        duration: 1500,
      },
      {
        type: "fadeIn",
        elementSelector: getCommandElemSelector(
          "AgenticWorkflowDetails.containerConfiguration",
        ),
        duration: 1500,
      },
      {
        type: "fadeIn",
        elementSelector: getCommandElemSelector("DatabaseAccessEditor"),
        duration: 1500,
      },
      {
        type: "fadeIn",
        elementSelector: getCommandElemSelector(
          "AgenticWorkflowDetails.orchestrationTools",
        ),
        duration: 1500,
      },
      {
        type: "fadeIn",
        elementSelector: getCommandElemSelector(
          "AgenticWorkflowDetails.agents",
        ),
        duration: 1500,
      },

      {
        type: "fadeIn",
        elementSelector: getCommandElemSelector("UserInput"),
        duration: 1500,
      },
    ],
  });

  // await addScene({
  //   animations: [
  //     {
  //       type: "fadeIn",
  //       elementSelector: getCommandElemSelector(
  //         "AgenticWorkflowDetails.description",
  //       ),
  //       duration: 1500,
  //     },
  //     {
  //       type: "fadeIn",
  //       elementSelector: getCommandElemSelector(
  //         "AgenticWorkflowDetails.containerConfiguration",
  //       ),
  //       duration: 1500,
  //     },
  //     {
  //       type: "fadeIn",
  //       elementSelector: getCommandElemSelector("DatabaseAccessEditor"),
  //       duration: 1500,
  //     },
  //     {
  //       type: "fadeIn",
  //       elementSelector: getCommandElemSelector("UserInput"),
  //       duration: 1500,
  //     },
  //   ],
  // });

  await addSceneAnimation(getDataKey("sourcePaths"), undefined, "fast");

  await page
    .locator(
      `${getCommandElemSelector("FileTree")} ${getDataLabel("Documents")}`,
    )
    .click();
  await page
    .locator(
      `${getCommandElemSelector("FileTree")} ${getDataLabel("Receipts")}`,
    )
    .click();
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

  await addSceneAnimation(getDataKey("Definition"), undefined, {
    waitBeforeClick: 1500,
  });

  await addSceneAnimation(
    getCommandElemSelector("AgenticWorkflow.start"),
    undefined,
    "fast",
  );
  await addScene({ animations: [{ type: "wait", duration: 1000 }] });

  await addSceneAnimation(getDataKey("Activity"));
  await addScene({ animations: [{ type: "wait", duration: 1000 }] });
  await page
    .locator(getDataLabel("documents get_document_text"))
    .nth(1)
    .waitFor({ state: "visible", timeout: 35000 });
  await addSceneAnimation(
    {
      selector: getDataLabel("documents get_document_text"),
      nth: 0,
    },
    undefined,
    "fast",
  );
  await addScene({
    animations: [
      {
        type: "growIn",
        startScale: 0.8,
        elementSelector: getCommandElemSelector("ToolCall"),
        duration: 300,
      },
      { type: "wait", duration: 1500 },
      {
        type: "click",
        elementSelector:
          getCommandElemSelector("ToolCall") +
          " " +
          getCommandElemSelector("Popup.close"),
        duration: 750,
      },
    ],
  });

  await page.keyboard.press("Escape");

  await addSceneAnimation({
    selector: getDataLabel("receiptExtractor"),
    nth: 0,
  });
  await addScene({
    animations: [
      {
        type: "growIn",
        elementSelector:
          getCommandElemSelector("AskLLM.popup") + getDataKey("agent"),
        startScale: 0.95,
        duration: 150,
      },
      { type: "wait", duration: 2000 },
      {
        type: "click",
        elementSelector:
          getCommandElemSelector("AskLLM.popup") +
          getDataKey("agent") +
          " " +
          getCommandElemSelector("Popup.close"),
        duration: 750,
      },
    ],
  });

  await page.keyboard.press("Escape");

  await page
    .locator(getDataLabel("db insertMany receipts "))
    .waitFor({ state: "visible", timeout: 35000 });
  await addSceneAnimation(
    {
      nth: 0,
      selector:
        getDataLabel("db insertMany receipts ") +
        " " +
        getCommandElemSelector("AgenticWorkflowActivity.openTable"),
    },
    undefined,
    "faster",
  );

  await addScene({
    animations: [
      {
        type: "wait",
        duration: 2000,
      },
    ],
  });
};
