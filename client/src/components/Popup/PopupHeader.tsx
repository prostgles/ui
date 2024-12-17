import {
  mdiClose,
  mdiFullscreen,
  mdiUnfoldLessHorizontal,
  mdiUnfoldMoreHorizontal,
} from "@mdi/js";
import React from "react";
import Btn from "../Btn";
import { FlexCol, FlexRow } from "../Flex";
import { POPUP_CLASSES, type PopupProps } from "./Popup";

type PopupHeaderProps = PopupProps & {
  collapsed: boolean;
  fullScreen: boolean | undefined;
  onToggleFullscreen: VoidFunction;
  toggleContent: VoidFunction;
};
export const PopupHeader = ({
  subTitle,
  title,
  collapsible,
  showFullscreenToggle,
  onToggleFullscreen,
  headerRightContent,
  positioning,
  onClose,
  collapsed,
  fullScreen,
  toggleContent,
}: PopupHeaderProps) => {
  const showTitle = !!title;
  if (title && !onClose) {
    console.warn(
      "Popup title will not be shown because onClose is not defined",
    );
  }
  if (!showTitle) return null;

  return (
    <header
      className={`${POPUP_CLASSES.title} ${positioning === "right-panel" ? "ml-2" : "pl-1"} py-p5 pr-p5 flex-row ai-center bb b-color gap-1`}
    >
      {collapsible && (
        <Btn
          className="f-0"
          onClick={toggleContent}
          iconPath={
            !collapsed ? mdiUnfoldLessHorizontal : mdiUnfoldMoreHorizontal
          }
          title="Collapse/Expand content"
        />
      )}
      <FlexCol
        id="modal-headline"
        className={
          "ai-none jc-none f-1 font-20 noselect font-medium text-0 o-hidden text-ellipsis ta-left m-0 ws-nowrap py-p25 " +
          (collapsible ? " pointer " : " ")
        }
        onClick={collapsible ? toggleContent : undefined}
      >
        <h4
          className="m-0"
          style={{
            ...(collapsible ? { paddingLeft: 0 } : {}),
          }}
          title={typeof title === "string" ? title : undefined}
        >
          {title}
        </h4>
        {subTitle && (
          <h6
            title={subTitle}
            className="font-14 m-0 text-ellipsis text-1"
            style={{ opacity: 0.7, maxWidth: "200px" }}
          >
            {subTitle}
          </h6>
        )}
      </FlexCol>
      <FlexRow className="Popup-header-actions gap-0">
        {headerRightContent}
        {showFullscreenToggle && (
          <Btn
            className="f-0"
            iconPath={mdiFullscreen}
            color={fullScreen ? "action" : undefined}
            onClick={onToggleFullscreen}
          />
        )}
        <Btn
          data-command="Popup.close"
          data-close-popup={true}
          className="f-0"
          style={{ margin: "1px" }}
          iconPath={mdiClose}
          onClick={onClose}
        />
      </FlexRow>
    </header>
  );
};
