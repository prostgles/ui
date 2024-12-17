import { mdiPlay } from "@mdi/js";
import React, { useState } from "react";
import { r_useAppVideoDemo, useReactiveState, type Prgl } from "../App";
import Btn from "../components/Btn";
import { FlexCol } from "../components/Flex";
import Popup from "../components/Popup/Popup";
import type { DBS } from "../dashboard/Dashboard/DBS";
import { startWakeLock, VIDEO_DEMO_DB_NAME } from "../dashboard/W_SQL/TestSQL";
import { getKeys } from "../utils";
import { accessControlDemo } from "./accessControlDemo";
import { backupDemo } from "./backupDemo";
import { dashboardDemo } from "./dashboardDemo";
import { fileDemo } from "./fileDemo";
import { sqlDemo } from "./sqlVideoDemo";

const loadTest = async () => {
  const dbs: DBS = (window as any).dbs;
  console.log(dbs);
};

const VIDEO_DEMO_SCRIPTS = {
  backupDemo,
  fileDemo,
  accessControlDemo,
  sqlDemo,
  dashboardDemo,
  loadTest,
};
const demoScripts = getKeys(VIDEO_DEMO_SCRIPTS);
type DEMO_NAME = keyof typeof VIDEO_DEMO_SCRIPTS;

const videoTimings: { videoName: string; start: number; end: number }[] = [];
let currVideo: (typeof videoTimings)[number] | undefined;
const startVideoDemo = async (videoName: string) => {
  if (currVideo) {
    videoTimings.push({ ...currVideo, end: Date.now() });
  }
  currVideo = {
    videoName,
    start: Date.now(),
    end: 0,
  };
};

export const AppVideoDemo = ({ connection: { db_name } }: Prgl) => {
  const isOnDemoDatabase = db_name === VIDEO_DEMO_DB_NAME;
  const {
    state: { demoStarted },
  } = useReactiveState(r_useAppVideoDemo);
  const [showDemoOptions, setShowDemoOptions] =
    useState<HTMLButtonElement | null>(null);
  const startDemo = async (name?: DEMO_NAME) => {
    setShowDemoOptions(null);

    if (!isOnDemoDatabase) {
      throw new Error("Cannot start demo on a non-demo database");
    }
    r_useAppVideoDemo.set({ demoStarted: true });
    const { stopWakeLock } = await startWakeLock();
    if (name) {
      await VIDEO_DEMO_SCRIPTS[name]();
    } else {
      const {
        sqlDemo,
        accessControlDemo,
        backupDemo,
        fileDemo,
        dashboardDemo,
      } = VIDEO_DEMO_SCRIPTS;
      startVideoDemo("SQL");
      await sqlDemo();
      startVideoDemo("Access Control");
      await accessControlDemo();
      startVideoDemo("Dashboard");
      await dashboardDemo();
      startVideoDemo("Backups");
      await backupDemo();
      startVideoDemo("the end");
    }
    stopWakeLock();
  };

  if (demoStarted || !isOnDemoDatabase) {
    return null;
  }
  return (
    <>
      <Btn
        //@ts-ignore
        _ref={(node) => {
          if (!node) return;
          node.start = () => {
            return startDemo();
          };
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowDemoOptions(e.currentTarget);
        }}
        // style={{ opacity: isOnDemoDatabase? 1 : 0 }}
        data-command="AppDemo.start"
        onClick={() => startDemo()}
        iconPath={mdiPlay}
      />
      {showDemoOptions && (
        <Popup anchorEl={showDemoOptions} positioning="beneath-left">
          <FlexCol className="gap-0">
            {demoScripts.map((key) => (
              <Btn key={key} onClick={() => startDemo(key)}>
                {key}
              </Btn>
            ))}
          </FlexCol>
        </Popup>
      )}
    </>
  );
};
