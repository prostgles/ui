import { getCommandElemSelector, getDataKey } from "Testing";
import { hygieneRatingsApiScenario } from "testAskLLM/scenarios/hygieneRatingsApi.scenario";
import { allowOnce, newChat, setPromptByText } from "utils/utils";
import type { OnBeforeScreenshot } from "./SVG_SCREENSHOT_DETAILS";
import { typeSendAddScenes } from "./utils/typeSendAddScenes";

export const aiAssistantAgenticWorkflowGovApiSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection },
  { addScene, addSceneAnimation },
) => {
  // if (Math.PI) throw "Done";
  await openConnection("food_delivery");
  await page.getByTestId("AskLLM").click();
  await page.waitForTimeout(1000);

  await newChat(page);
  await setPromptByText(page, "Create workflow");
  await typeSendAddScenes(
    page,
    addScene,
    hygieneRatingsApiScenario.firstMessage,
    undefined,
    undefined,
    { LlmResponseLoadingDuration: 0 },
  );
  await allowOnce(page);
  await page.waitForTimeout(1e3);
  await allowOnce(page);

  await addSceneAnimation(
    getDataKey(
      "Create a new table and save ratings for all restaurants (recommended)",
    ),
  );
  await addSceneAnimation(getCommandElemSelector("AskUserQuestions.confirm"));
  await addScene({
    animations: [{ type: "wait", duration: 800 }],
  });
  await page
    .getByTestId("AgenticWorkflow.start")
    .waitFor({ state: "visible", timeout: 35000 });
  await page.getByTestId("AgenticWorkflow.start").scrollIntoViewIfNeeded();
  await addScene({
    svgFileName: "hygiene_ratings_workflow",
    animations: [
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
    ],
  });
  await addSceneAnimation(
    getCommandElemSelector("TableAccessEditor.newTableDDL"),
  );
  await addScene({
    animations: [{ type: "wait", duration: 1500 }],
  });
  await page.getByTestId("Popup.close").last().click();
  await addSceneAnimation(
    getDataKey("restaurants") +
      " " +
      getCommandElemSelector("selectRuleAdvanced"),
  );
  await addScene({
    animations: [{ type: "wait", duration: 2000 }],
  });
  await page.getByTestId("Popup.close").last().click();

  await addSceneAnimation(getDataKey("Definition"));
  await page.locator(".monaco-editor .monaco-scrollable-element").click();
  await page.mouse.wheel(0, -800); // scroll up
  await page.waitForTimeout(5e3);
  await page.mouse.wheel(0, -800); // scroll up

  await addScene({
    svgFileName: "hygiene_ratings_workflow_definition",
    animations: [{ type: "wait", duration: 1000 }],
  });
  await addSceneAnimation(getCommandElemSelector("AgenticWorkflow.start"));
  await addSceneAnimation(getDataKey("Activity"));
  await page.waitForTimeout(5e3);
  // await addSceneAnimation(
  //   getCommandElemSelector("AgenticWorkflow.stop"),
  //   undefined,
  //   "faster",
  // );
  await addSceneAnimation({
    nth: 0,
    selector: getCommandElemSelector("AgenticWorkflowActivity.openTable"),
  });
  await addScene({
    svgFileName: "hygiene_ratings_table",
    animations: [{ type: "wait", duration: 1500 }],
  });
};
