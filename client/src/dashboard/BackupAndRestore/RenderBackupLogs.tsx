import React from "react";
import PopupMenu from "../../components/PopupMenu";
import Btn from "../../components/Btn";
import { sliceText } from "../../../../commonTypes/utils";
import { CodeEditor } from "../CodeEditor/CodeEditor";

export const RenderBackupLogs = ({
  logs,
  completed,
  // type,
}: {
  logs: string;
  completed: boolean;
  // type: "restore" | "dump";
}) => (
  <PopupMenu
    showFullscreenToggle={{}}
    title="Logs"
    button={
      !logs ?
        <div></div>
      : <Btn className="w-full" variant="outline" size="small">
          {completed ?
            "..."
          : sliceText(
              (logs || "").split("\n").at(-1)!.slice(15).split(":")[1] ?? "",
              40,
              "...",
            )
          }
        </Btn>
    }
    onClickClose={false}
    positioning="top-center"
  >
    <CodeEditor
      style={{ minWidth: "80vw", minHeight: "80vh" }}
      value={logs}
      options={{
        minimap: { enabled: false },
        lineNumbers: "off",
      }}
      language="bash"
    />
  </PopupMenu>
);
