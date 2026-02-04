import Btn from "@components/Btn";
import { classOverride, FlexCol, FlexRow } from "@components/Flex";
import { POPUP_ZINDEX } from "@components/Popup/Popup";
import { mdiFullscreen } from "@mdi/js";
import React, { useEffect, useState } from "react";

export const IFrame = ({
  src,
  title,
  className,
}: {
  src: string;
  title: string;
  className?: string;
}) => {
  const [showFullscreen, setShowFullscreen] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        setShowFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <FlexCol
      className={classOverride("gap-0 bg-color-0", className)}
      style={
        showFullscreen ?
          { position: "fixed", inset: 0, zIndex: POPUP_ZINDEX + 1 }
        : {}
      }
    >
      <FlexRow>
        <div className="text-sm text-color-4 f-1 px-1 ta-start">{title}</div>
        <Btn
          title="Toggle Fullscreen"
          iconPath={mdiFullscreen}
          onClick={() => setShowFullscreen(!showFullscreen)}
        />
      </FlexRow>
      <iframe className="f-1 w-full h-full" src={src} />
    </FlexCol>
  );
};
