import { mdiFullscreen } from "@mdi/js";
import React from "react";
import Btn, { type BtnProps } from "../Btn";
import { classOverride, FlexCol, FlexRow } from "../Flex";
import { useFullscreen } from "./useFullscreen";

export const FullscreenWrapper = ({
  className,
  style,
  title,
  content,
  endActions,
}: {
  className?: string;
  style?: React.CSSProperties;
  title: React.ReactNode;
  content: React.ReactNode;
  endActions?: (Pick<
    BtnProps,
    "disabledInfo" | "title" | "onClick" | "onClickPromise" | "color"
  > & {
    iconPath: string;
  })[];
}) => {
  const { fullscreen, setFullscreen, fullscreenStyle } = useFullscreen();

  return (
    <FlexCol
      className={classOverride(
        "FullscreenWrapper relative b b-color rounded gap-0 f-0 o-hidden ",
        className,
      )}
      aria-modal={fullscreen}
      style={{
        minWidth: "min(100%,600px, 100vw)",
        ...style,
        ...fullscreenStyle,
      }}
      data-command="MarkdownMonacoCode"
    >
      <FlexRow className="MarkdownMonacoCodeHeader bg-color-2 p-p25">
        <div className="text-sm text-color-4 f-1 px-1no ta-start flex-row gap-p5">
          {title}
        </div>
        {endActions?.map((action, i) => (
          <Btn
            key={i}
            title={action.title}
            iconPath={action.iconPath}
            onClick={action.onClick}
          />
        ))}
        <Btn
          title="Toggle Fullscreen"
          iconPath={mdiFullscreen}
          onClick={() => setFullscreen(!fullscreen)}
        />
      </FlexRow>
      {content}
    </FlexCol>
  );
};
