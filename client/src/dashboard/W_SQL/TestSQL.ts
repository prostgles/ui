import { tryCatchV2 } from "prostgles-types";
import { tout } from "../../pages/ElectronSetup/ElectronSetup";
import {
  TopHeaderClassName,
  type WindowSyncItem,
} from "../Dashboard/dashboardUtils";
import { createTables } from "./demoScripts/createTables";
import { mainTestScripts } from "./demoScripts/mainTestScripts";
import { testBugs } from "./demoScripts/testBugs";
import { testMiscAndBugs } from "./demoScripts/testMiscAndBugs";
import { getDemoUtils } from "./getDemoUtils";

export const VIDEO_DEMO_DB_NAME = "prostgles_video_demo";
export const TestSQL = async (w: WindowSyncItem<"sql">) => {
  const testUtils = getDemoUtils(w);

  // const currDbName = await testUtils.runDbSQL(`SELECT current_database() as db_name`, { }, { returnType: "value" });
  // if(currDbName === VIDEO_DEMO_DB_NAME){
  //   return videoDemo(testUtils);
  // }

  document.querySelector("." + TopHeaderClassName)?.remove();
  alert("Ensure cursor is inside the editor so suggestions show as expected");
  await tout(1000);

  const { stopWakeLock } = await startWakeLock();
  await testBugs(testUtils);
  await testMiscAndBugs(testUtils);
  await createTables(testUtils);
  await mainTestScripts(testUtils);
  stopWakeLock();

  alert("Demo finished successfully");
};

export const startWakeLock = async () => {
  const { data: wakeLock } = await tryCatchV2(async () => {
    const wakeLock = await navigator.wakeLock.request("screen");
    return wakeLock;
  });

  return {
    stopWakeLock: async () => {
      try {
        const res = await wakeLock;
        res?.release();
      } catch (e) {
        console.error(e);
      }
    },
  };
};
