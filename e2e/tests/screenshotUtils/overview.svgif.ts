import { getCommandElemSelector, type SVGif } from "Testing";
import {
  closeWorkspaceWindows,
  getDataKey,
  monacoType,
  runDbSql,
} from "utils/utils";
import type { OnBeforeScreenshot } from "./utils/saveSVGs";
import { typeSendAddScenes } from "./aiAssistant.svgif";

export const overviewSvgif: OnBeforeScreenshot = async (
  page,
  { openConnection, openMenuIfClosed, hideMenuIfOpen },
  addScene,
) => {
  throw new Error("This should just use existing svgif scenes");
};
