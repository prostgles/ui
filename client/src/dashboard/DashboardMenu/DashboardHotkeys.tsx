import { mdiKeyboard } from "@mdi/js"
import Icon from "@mdi/react"
import React from "react"
import { Hotkey } from "../../components/Hotkey"

type P = {
  keyStyle?: React.CSSProperties;
  style?: React.CSSProperties;
}
export const DashboardHotkeys = ({ keyStyle, style }: P) => {
  
  return <div 
    className="flex-col ai-start gap-p5  mt-1"
    color="info"
    style={style}
  >
    <h4 className="flex-row ai-center gap-1 font-16 m-0">
      <Icon path={mdiKeyboard} size={1}></Icon> 
      Hotkeys:
    </h4>
    <Hotkey keyStyle={keyStyle} label="Open a table or script" keys={["ctrl", "p"]} />
    <Hotkey keyStyle={keyStyle} label="Search all data" keys={["ctrl", "shift", "f"]} />
    <Hotkey keyStyle={keyStyle} label="Open an SQL File" keys={["ctrl", "o"]} />
  </div>
}