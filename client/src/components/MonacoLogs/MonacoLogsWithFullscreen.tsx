import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { Label } from "@components/Label";
import { mdiFullscreen } from "@mdi/js";
import React, { useEffect, useMemo, useState } from "react";
import { MonacoLogs } from "./MonacoLogs";
import type { TestSelectors } from "src/Testing";
import Popup, { useIsInsidePopup } from "@components/Popup/Popup";

export const MonacoLogsWithFullscreen = ({
  logs,
  label,
  minHeight = 100,
  maxHeight = 300,
  style,
  ...testSelectors
}: {
  logs: string;
  label: React.ReactNode;
  minHeight?: number;
  maxHeight?: number;
  style?: React.CSSProperties;
} & TestSelectors) => {
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

  const monacoStyle = useMemo(
    () => ({
      minWidth: "min(400px, 100%)",
      width: "100%",
      maxHeight: fullscreen ? undefined : `${maxHeight}px`,
      height: fullscreen ? "100%" : undefined,
      overflow: "hidden",
      flex: 1,
    }),
    [fullscreen, maxHeight],
  );
  const divRef = React.useRef<HTMLDivElement>(null);
  const isInsidePopup = useIsInsidePopup();

  if (isInsidePopup && fullscreen) {
    return (
      <Popup
        positioning="fullscreen"
        onClose={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setFullscreen(false);
        }}
      >
        <FullScreenHeader fullscreen={fullscreen} setFullscreen={setFullscreen}>
          {label}
        </FullScreenHeader>
        <MonacoLogs style={monacoStyle} minHeight={minHeight} logs={logs} />
      </Popup>
    );
  }

  return (
    <FlexCol
      ref={divRef}
      {...testSelectors}
      className="bg-color-0 gap-p25"
      style={{
        ...style,
        ...(fullscreen ?
          {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 1000,
          }
        : undefined),
      }}
    >
      <FullScreenHeader fullscreen={fullscreen} setFullscreen={setFullscreen}>
        {label}
      </FullScreenHeader>
      <MonacoLogs style={monacoStyle} minHeight={minHeight} logs={logs} />
    </FlexCol>
  );
};

export const FullScreenHeader = ({
  children,
  fullscreen,
  setFullscreen,
  className,
}: {
  children: React.ReactNode;
  fullscreen: boolean;
  setFullscreen: (fullscreen: boolean) => void;
  className?: string;
}) => {
  return (
    <FlexRow>
      <Label
        variant="normal"
        className={"f-1" + (fullscreen ? " px-1" : "") + ` ${className}`}
      >
        {children}
      </Label>
      <Btn
        iconPath={mdiFullscreen}
        size="small"
        onClick={() => setFullscreen(!fullscreen)}
      />
    </FlexRow>
  );
};
