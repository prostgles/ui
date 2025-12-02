import { mdiChevronDown, mdiChevronRight, mdiFullscreen } from "@mdi/js";
import React, { useState } from "react";
import { omitKeys } from "prostgles-types";
import type { BtnProps } from "./Btn";
import Btn from "./Btn";
import { classOverride, FlexRow } from "./Flex";
import Popup from "./Popup/Popup";
import type { Command, TestSelectors } from "../Testing";

type SectionProps = TestSelectors & {
  title: React.ReactNode;
  titleRightContent?: React.ReactNode;
  children: React.ReactNode;
  buttonStyle?: React.CSSProperties;
  btnProps?: BtnProps<void>;
  className?: string;
  disabledInfo?: string;
  contentStyle?: React.CSSProperties;
  contentClassName?: string;
  open?: boolean;
  titleIconPath?: string;
  disableFullScreen?: boolean;
} & (
    | {
        style?: React.CSSProperties;
      }
    | {
        getStyle?: (expanded: boolean) => React.CSSProperties;
      }
  ) &
  (
    | {
        titleIconPath?: string;
        titleIcon?: undefined;
      }
    | {
        titleIcon?: React.ReactNode;
        titleIconPath?: undefined;
      }
  );

export const Section = (props: SectionProps) => {
  const {
    children,
    title,
    className = "",
    disableFullScreen,
    disabledInfo,
    contentClassName = "",
    contentStyle = {},
    buttonStyle = {},
    open: oDef,
    titleRightContent,
    titleIcon,
    titleIconPath,
    btnProps,
    "data-command": dataCommand,
    "data-key": dataKey,
    ...otherProps
  } = props;
  const [open, toggle] = useState(oDef);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div
      data-command={dataCommand satisfies Command | undefined}
      data-key={dataKey}
      className={classOverride(
        "Section flex-col min-h-0 f-0 relative bg-inherit " +
          (open ? "bb b-color" : ""),
        className,
      )}
      style={
        "getStyle" in otherProps ? otherProps.getStyle?.(!!open)
        : "style" in otherProps ?
          otherProps.style
        : undefined
      }
    >
      <div
        className="Section__Header flex-row ai-center noselect pointer f-0 bb b-color bg-inherit"
        style={
          !open ?
            {
              borderBottom: "unset", // "1px solid var(--b-color)", It looks better without border when closed?
              borderTop: "unset",
            }
          : {
              position: "sticky",
              top: 0,
              zIndex: 1,
              borderBottom: "unset",
              marginBottom: ".5em",
            }
        }
      >
        <Btn
          className={
            (titleRightContent ? "" : "f-1d") +
            " p-p5 ta-left font-20 bold jc-start mr-1"
          }
          title="Expand section"
          disabledInfo={disabledInfo}
          style={{
            width: undefined,
            ...buttonStyle,
          }}
          iconPath={
            titleIcon ? undefined : (
              (titleIconPath ?? (!open ? mdiChevronRight : mdiChevronDown))
            )
          }
          iconNode={titleIcon}
          {...(omitKeys(btnProps ?? {}, ["onClick"]) as BtnProps<void>)}
          onClick={fullscreen ? undefined : () => toggle(!open)}
        >
          {title}
        </Btn>
        {titleRightContent}
        {!disableFullScreen && (
          <Btn
            className={fullscreen ? "" : "show-on-parent-hover"}
            iconPath={mdiFullscreen}
            data-command="Section.toggleFullscreen"
            onClick={() => setFullscreen(!fullscreen)}
            color={fullscreen ? "action" : undefined}
          />
        )}
      </div>

      {(open || fullscreen) && (
        <div style={contentStyle} className={contentClassName}>
          {children}
        </div>
      )}

      {fullscreen && (
        <Popup
          positioning="fullscreen"
          title={
            <FlexRow className="trigger-hover-force">
              {titleIcon}
              {title}
              {titleRightContent}
            </FlexRow>
          }
          contentClassName={contentClassName}
          contentStyle={contentStyle}
          onClose={() => {
            setFullscreen(false);
          }}
        >
          {children}
        </Popup>
      )}
    </div>
  );
};
