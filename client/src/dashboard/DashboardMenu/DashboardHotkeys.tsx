import { mdiKeyboard } from "@mdi/js";
import React from "react";
import { Hotkey } from "../../components/Hotkey";
import { SectionHeader } from "../AccessControl/AccessControlRuleEditor";

type P = {
  keyStyle?: React.CSSProperties;
  style?: React.CSSProperties;
};
export const DashboardHotkeys = ({ keyStyle, style }: P) => {
  return (
    <div className="flex-col ai-start gap-p5  mt-1" color="info" style={style}>
      <SectionHeader icon={mdiKeyboard} size="small">
        Hotkeys
      </SectionHeader>
      <Hotkey
        keyStyle={keyStyle}
        label="Open a table or script"
        keys={["ctrl", "p"]}
      />
      <Hotkey
        keyStyle={keyStyle}
        label="Search all data"
        keys={["ctrl", "shift", "f"]}
      />
      <Hotkey
        keyStyle={keyStyle}
        label="Open an SQL File"
        keys={["ctrl", "o"]}
      />
    </div>
  );
};
