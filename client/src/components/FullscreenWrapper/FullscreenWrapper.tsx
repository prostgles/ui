import { mdiClose, mdiFullscreen } from "@mdi/js";
import React from "react";
import Btn, { type BtnProps } from "../Btn";
import { classOverride, FlexCol, FlexRow } from "../Flex";
import { useFullscreen } from "./useFullscreen";
import type { TestSelectors } from "src/Testing";
import Popup from "@components/Popup/Popup";

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
  const divRef = React.useRef<HTMLDivElement>(null);
  const isInsidePopup = !!divRef.current?.closest(
    `[aria-modal="true"],[role="dialog"]`,
  );
  return (
    <WrapInPopupIfNeeded
      wrapInPopup={isInsidePopup && fullscreen}
      onClose={() => setFullscreen(false)}
    >
      <FlexCol
        ref={divRef}
        {...testSelectors}
        /** This is done to ensure that monaco editors revert to initial size within chat */
        key={fullscreen.toString()}
        className={classOverride(
          "FullscreenWrapper relative b b-color rounded gap-0 o-hidden " +
            (fullscreen ? "f-1" : "f-0"),
          className,
        )}
        aria-modal={fullscreen}
        data-command="FullscreenWrapper"
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
        <FlexRow className="bg-color-2 p-p25 gap-0">
          <div className="text-sm text-color-4 f-1 ta-start flex-row gap-p5">
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
            data-command="FullscreenWrapper.toggleFullscreen"
            iconPath={fullscreen ? mdiClose : mdiFullscreen}
            size="small"
            onClick={() => setFullscreen(!fullscreen)}
          />
        </FlexRow>
        {children}
      </FlexCol>
    </WrapInPopupIfNeeded>
  );
};

const WrapInPopupIfNeeded = ({
  children,
  onClose,
  wrapInPopup,
}: {
  children: React.ReactNode;
  wrapInPopup: boolean;
  onClose: () => void;
}) => {
  if (wrapInPopup) {
    return (
      <Popup positioning="fullscreen" onClose={onClose}>
        {children}
      </Popup>
    );
  }
  return <>{children}</>;
};
