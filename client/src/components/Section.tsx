import { mdiChevronDown, mdiChevronRight, mdiFullscreen } from "@mdi/js";
import React, { useState } from "react";
import { omitKeys } from "prostgles-types";
import type { BtnProps } from "./Btn";
import Btn from "./Btn";
import { classOverride } from "./Flex";
import Popup from "./Popup/Popup";
import type { Command, TestSelectors } from "../Testing";

type SectionProps = TestSelectors & {
  title: string;
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

export function Section(props: SectionProps) {
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
    ...otherProps
  } = props;
  const [open, toggle] = useState(oDef);
  const [fullscreen, setfullscreen] = useState(false);
  const toggleFullScreen = () => {
    setfullscreen((v) => !v);
  };

  const content = (
    <div
      data-command={dataCommand satisfies Command | undefined}
      className={classOverride(
        "Section flex-col min-h-0 f-0 relative bg-inherit ",
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
          !open ? undefined : (
            {
              position: "sticky",
              top: 0,
              zIndex: 1,
              marginBottom: ".5em",
            }
          )
        }
      >
        <Btn
          className={
            (titleRightContent ? "" : "f-1") +
            " p-p5 ta-left font-20 bold jc-start mr-1"
          }
          title="Expand section"
          disabledInfo={disabledInfo}
          style={{
            width: undefined,
            flex: 1,
            ...buttonStyle,
          }}
          iconPath={
            titleIcon ? undefined : (
              (titleIconPath ?? (!open ? mdiChevronRight : mdiChevronDown))
            )
          }
          iconNode={titleIcon}
          {...(omitKeys(btnProps ?? {}, ["onClick"]) as any)}
          onClick={fullscreen ? undefined : () => toggle(!open)}
        >
          {title}
        </Btn>
        {!disableFullScreen && (
          <Btn
            className={fullscreen ? "" : "show-on-parent-hover"}
            iconPath={mdiFullscreen}
            onClick={toggleFullScreen}
            color={fullscreen ? "action" : undefined}
          />
        )}
        {titleRightContent}
      </div>

      {(open || fullscreen) && (
        <div style={contentStyle} className={contentClassName}>
          {children}
        </div>
      )}
    </div>
  );

  if (fullscreen) {
    return <Popup positioning="fullscreen">{content}</Popup>;
  }

  return content;
}
