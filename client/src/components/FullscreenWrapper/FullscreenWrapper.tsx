import Popup from "@components/Popup/Popup";
import {
  mdiClose,
  mdiFullscreen,
  mdiUnfoldLessHorizontal,
  mdiUnfoldMoreHorizontal,
} from "@mdi/js";
import React, { useState } from "react";
import type { TestSelectors } from "src/Testing";
import Btn, { type BtnProps } from "../Btn";
import { classOverride, FlexCol, FlexRow } from "../Flex";
import { useFullscreen } from "./useFullscreen";

export const FullscreenWrapper = ({
  className,
  style,
  title,
  children,
  endActions,
  maxContentHeight,
  footer,
  borderWrapperClassName,
  ...testSelectors
}: TestSelectors & {
  className?: string;
  borderWrapperClassName?: string;
  style?: React.CSSProperties;
  maxContentHeight?: number | string;
  title: React.ReactNode | ((minimized: boolean) => React.ReactNode);
  children: React.ReactNode;
  footer?: React.ReactNode;
  endActions?: (Pick<
    BtnProps,
    "disabledInfo" | "title" | "onClick" | "onClickPromise" | "color"
  > & {
    iconPath: string;
  })[];
}) => {
  const [minimized, setMinimized] = useState(false);
  const divRef = React.useRef<HTMLDivElement>(null);
  const isInsidePopup = !!divRef.current?.closest(
    `[aria-modal="true"],[role="dialog"]`,
  );
  const { fullscreen, setFullscreen, fullscreenStyle } = useFullscreen(
    divRef,
    isInsidePopup,
  );
  return (
    <WrapInPopupIfNeeded
      wrapInPopup={isInsidePopup && fullscreen}
      onClose={() => setFullscreen(false)}
    >
      <FlexCol
        ref={divRef}
        data-command="FullscreenWrapper"
        {...testSelectors}
        /** This is done to ensure that monaco editors revert to initial size within chat */
        key={fullscreen.toString()}
        className={classOverride(
          "FullscreenWrapper " + (fullscreen ? "f-1" : "f-0"),
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
          ...(minimized && !fullscreen ?
            { minHeight: 0, height: undefined }
          : {}),
        }}
      >
        <FlexCol
          className={classOverride(
            "f-1 relative b b-color rounded gap-0 o-hidden",
            borderWrapperClassName,
          )}
        >
          <FlexRow className="bg-color-2 p-p25 gap-0">
            <div
              className={
                "ai-center text-sm text-color-4 f-1 ta-start flex-row gap-p5" +
                (minimized ? " noselect pointer " : "")
              }
              onClick={minimized ? () => setMinimized(false) : undefined}
            >
              {typeof title === "function" ? title(minimized) : title}
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
              title={minimized ? "Maximize" : "Minimize"}
              data-command="FullscreenWrapper.toggleMinimize"
              iconPath={
                minimized ? mdiUnfoldMoreHorizontal : mdiUnfoldLessHorizontal
              }
              size="small"
              disabledInfo={
                fullscreen ? "Cannot minimize in fullscreen mode" : undefined
              }
              onClick={() => {
                setMinimized((m) => !m);
                setFullscreen(false);
              }}
            />
            <Btn
              title={fullscreen ? "Exit Fullscreen" : "Toggle Fullscreen"}
              data-command="FullscreenWrapper.toggleFullscreen"
              iconPath={fullscreen ? mdiClose : mdiFullscreen}
              size="small"
              onClick={() => {
                setFullscreen(!fullscreen);
                setMinimized(false);
              }}
            />
          </FlexRow>
          {minimized ? null : children}
        </FlexCol>
        {minimized ?
          null
        : !fullscreen ?
          footer
        : <div className="p-1">{footer}</div>}
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
