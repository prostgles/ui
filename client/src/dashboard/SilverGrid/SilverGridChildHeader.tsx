import {
  mdiClose,
  mdiFullscreen,
  mdiFullscreenExit,
  mdiMenu,
  mdiUnfoldLessHorizontal,
  mdiUnfoldMoreHorizontal,
} from "@mdi/js";
import React from "react";
import Btn from "../../components/Btn";
import type { SilverGridChildProps } from "./SilverGridChild";
import { dataCommand } from "../../Testing";
import { appTheme, useReactiveState } from "../../appUtils";
import { FlexRow } from "../../components/Flex";
export const GridHeaderClassname = "silver-grid-item-header--title" as const;

type P = SilverGridChildProps & {
  fullscreen: boolean;
  height: number;
  minimized: boolean | undefined;
  onClickClose: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onSetMinimized: (newValue: boolean) => void;
  onClickFullscreen: VoidFunction;
  onSetHeaderRef: (ref: HTMLDivElement) => void;
};

const CloseButton = ({
  tabId,
  onClose,
}: { tabId: string | undefined } & Pick<P, "onClose">) => {
  if (!onClose || !tabId) return null;
  return (
    <Btn
      className="SilverGridChild_CloseButton show-on-parent-hover f-0"
      size="micro"
      iconProps={{
        size: 0.75,
        path: mdiClose,
      }}
      iconPath={mdiClose}
      onClick={(e) => onClose(tabId, e)}
    />
  );
};

const TITLE_ID_ATTRNAME = "data-title-item-id" as const;
export const getSilverGridTitleNode = (id: string) =>
  document.body.querySelector<HTMLDivElement>(
    `[${TITLE_ID_ATTRNAME}=${JSON.stringify(id)}]`,
  );
export const SilverGridChildHeader = (props: P) => {
  const {
    headerIcon,
    minimize,
    hideButtons: _hideButtons = {},
    onClose,
    layoutMode,
    height,
    minimized,
    onSetHeaderRef,
    fullscreen,
    onSetMinimized,
    onClickFullscreen,
    onClickClose,
    siblingTabs,
    onClickSibling,
    activeTabKey,
  } = props;
  const lineHeight = window.isMobileDevice ? 16 : 24;

  const tabs = siblingTabs?.length ? siblingTabs : [props.layout];
  const isFixed = layoutMode === "fixed";
  const hideButtons: typeof _hideButtons =
    isFixed ?
      {
        minimize: true,
        fullScreen: false,
        close: true,
        pan: true,
        resize: true,
      }
    : _hideButtons;
  const { state: theme } = useReactiveState(appTheme);
  const bgClass = theme === "dark" ? "bg-color-0" : "bg-color-3";
  const bgActiveClass = theme === "dark" ? "bg-color-2" : "bg-color-0";
  const btnClass = `f-0 ${isFixed && !fullscreen ? "show-on-parent-hover" : ""}`;

  return (
    <div
      className="silver-grid-item-header flex-row  bg-color-0 bb b-color-0 pointer f-0 noselect relative ai-center shadow"
      style={
        isFixed ?
          {
            paddingRight: ".25em",
          }
        : {}
      }
    >
      <div
        className="silver-grid-item-header--icon flex-row f-0 o-hidden f-1 ai-center"
        style={{
          maxWidth: "fit-content",
          minWidth: "42px",
        }}
      >
        {headerIcon}
      </div>

      <FlexRow
        className="SilverGridChildHeader_tabs flex-row f-1 min-w-0 ws-nowrap ai-end text-ellipsiss ml-p25 o-auto  no-scroll-bar"
        style={{
          gap: "1px",
        }}
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY;
        }}
      >
        {tabs.map((tab) => {
          const attrs = { [TITLE_ID_ATTRNAME]: tab.id };
          if (tab.id !== activeTabKey) {
            const title = tab.title || tab.id;
            const tabId = tab.id;
            return (
              <FlexRow
                key={tab.id}
                className={`gap-p25 pl-p5 pr-p25 ${bgClass}`}
                onClick={() => {
                  onClickSibling?.(tab.id!);
                }}
                style={{
                  height: `${height - 3}px`,
                  marginTop: "4px",
                  lineHeight: "21px",
                  maxWidth: "40%",
                }}
                title={title ?? ""}
              >
                <div
                  className={"f-1 min-w-0 ws-nowrap text-ellipsis py-p5 "}
                  style={{
                    padding: ".5em 0 .5em .75em ",
                  }}
                  {...attrs}
                >
                  {title}
                </div>
                {isFixed ?
                  <div style={{ width: "1em" }} />
                : <CloseButton {...props} tabId={tabId} />}
              </FlexRow>
            );
          }

          return (
            <FlexRow
              key={tab.id}
              ref={(r) => {
                if (r) {
                  onSetHeaderRef(r);
                }
              }}
              className={`gap-p25 pl-p5 pr-p25 ${bgActiveClass}`}
              style={{
                height: `${height}px`,
                lineHeight: `${lineHeight + 2}px`,
                /** Prevent total collapse when there is not enough space */
                minWidth: "80px",
                justifyContent: "space-between",
                marginTop: "2px",
                /** Used to prevent unexpected scroll of tab headers */
                overflowY: "hidden",
                maxWidth: "max(300px, 40%)",
              }}
            >
              <div
                className={`${GridHeaderClassname} py-p5 f-1 min-w-0 max-w-fit text-ellipsis noselect `}
                {...attrs}
              >
                {tab.title}
              </div>
              {isFixed ?
                <div style={{ width: "1em" }} />
              : <CloseButton {...props} tabId={tab.id} />}
            </FlexRow>
          );
        })}
      </FlexRow>

      {!hideButtons.minimize && (
        <Btn
          {...dataCommand("dashboard.window.collapse")}
          className={btnClass}
          iconPath={
            !minimized ? mdiUnfoldLessHorizontal : mdiUnfoldMoreHorizontal
          }
          disabledInfo={fullscreen ? "Must exit fullscreen" : undefined}
          title="Minimize/Maximize view"
          onClick={(e) => {
            if (minimize) {
              minimize.toggle();
            } else {
              onSetMinimized(!minimized);
            }
          }}
        />
      )}

      {!hideButtons.fullScreen && (
        <Btn
          {...dataCommand("dashboard.window.fullscreen")}
          title="Toggle view fullscreen mode"
          className={btnClass}
          iconPath={!fullscreen ? mdiFullscreen : mdiFullscreenExit}
          onClick={onClickFullscreen}
        />
      )}
      {onClose && !hideButtons.close && (
        <Btn
          {...dataCommand("dashboard.window.close")}
          title="Close view"
          className={btnClass}
          iconPath={mdiClose}
          onClick={(e) => onClickClose(e)}
        />
      )}
    </div>
  );
};
