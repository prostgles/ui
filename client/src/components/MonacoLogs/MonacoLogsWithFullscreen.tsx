import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { Label } from "@components/Label";
import { mdiFullscreen } from "@mdi/js";
import React, { useEffect, useState } from "react";
import { MonacoLogs } from "./MonacoLogs";

export const MonacoLogsWithFullscreen = ({
  logs,
  label,
  minHeight = 100,
  maxHeight = 300,
}: {
  logs: string;
  label: string;
  minHeight?: number;
  maxHeight?: number;
  style?: React.CSSProperties;
}) => {
  const [fullscreen, setFullscreen] = useState(false);

  /** Close on escape */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen]);

  return (
    <FlexCol
      className="bg-color-0 gap-p25"
      style={
        fullscreen ?
          {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 1000,
          }
        : undefined
      }
    >
      <FlexRow>
        <Label variant="normal" className={"f-1" + (fullscreen ? " px-1" : "")}>
          {label}
        </Label>
        <Btn
          iconPath={mdiFullscreen}
          onClick={() => setFullscreen(!fullscreen)}
        />
      </FlexRow>
      <MonacoLogs
        style={{
          minWidth: "400px",
          width: "100%",
          maxHeight: fullscreen ? undefined : `${maxHeight}px`,
          height: fullscreen ? "100%" : undefined,
          overflow: "hidden",
          flex: 1,
        }}
        minHeight={minHeight}
        logs={logs}
      />
    </FlexCol>
  );
};
