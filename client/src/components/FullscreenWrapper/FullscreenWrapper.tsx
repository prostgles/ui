import { mdiClose, mdiFullscreen } from "@mdi/js";
import React from "react";
import Btn, { type BtnProps } from "../Btn";
import { classOverride, FlexCol, FlexRow } from "../Flex";
import { useFullscreen } from "./useFullscreen";
import type { TestSelectors } from "src/Testing";

export const FullscreenWrapper = ({
  className,
  style,
  title,
  children,
  endActions,
  maxContentHeight,
  ...testSelectors
}: TestSelectors & {
  className?: string;
  style?: React.CSSProperties;
  maxContentHeight?: number | string;
  title: React.ReactNode;
  children: React.ReactNode;
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
      {...testSelectors}
      className={classOverride(
        "FullscreenWrapper relative b b-color rounded gap-0 f-0 o-hidden ",
        className,
      )}
      aria-modal={fullscreen}
      style={{
        minWidth: "min(100%, 600px, 100vw)",
        ...style,
        ...fullscreenStyle,
        ...(!fullscreen &&
          maxContentHeight && {
            maxHeight: maxContentHeight,
          }),
      }}
    >
      <FlexRow className="bg-color-2 p-p25">
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
          title={fullscreen ? "Exit Fullscreen" : "Toggle Fullscreen"}
          iconPath={fullscreen ? mdiClose : mdiFullscreen}
          size="small"
          onClick={() => setFullscreen(!fullscreen)}
        />
      </FlexRow>
      {children}
    </FlexCol>
  );
};
