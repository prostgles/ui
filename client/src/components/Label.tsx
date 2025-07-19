import { mdiHelp, mdiInformationOutline } from "@mdi/js";
import React from "react";
import Btn from "./Btn";
import Checkbox from "./Checkbox";
import { classOverride } from "./Flex";
import { Icon } from "./Icon/Icon";
import "./Label.css";
import PopupMenu from "./PopupMenu";

export type NormalLabelProps = {
  variant: "normal";
  iconPath?: undefined;
  leftIcon?: React.ReactNode;
  toggle?: {
    checked?: boolean;
    onChange: (checked: boolean) => void;
  };
};

export type HeaderLabelProps = {
  variant?: "header";
  iconPath?: string;
  leftIcon?: undefined;
  toggle?: undefined;
};

type LabelPropsCommon = React.DetailedHTMLProps<
  React.LabelHTMLAttributes<HTMLLabelElement>,
  HTMLLabelElement
> & {
  label?: string;
  info?: React.ReactNode;
  popupTitle?: React.ReactNode;
  size?: "small";
};

export type LabelPropsNormal = LabelPropsCommon & NormalLabelProps;
export type LabelPropsHeader = LabelPropsCommon & HeaderLabelProps;

export type LabelProps = LabelPropsNormal | LabelPropsHeader;

export const Label = ({
  info = null,
  variant = "header",
  iconPath = mdiHelp,
  label,
  popupTitle,
  className = "",
  toggle,
  children,
  size,
  leftIcon,
  ...otherProps
}: LabelProps) => {
  const isHeader = variant === "header";

  const ensureInfoBtnKeepsCardLayoutCellsConsistent = Boolean(
    !isHeader && info,
  );

  const IconBtn = info && (
    <PopupMenu
      title={popupTitle ?? label ?? "Information"}
      positioning="beneath-center"
      clickCatchStyle={{ opacity: 0.3 }}
      rootStyle={{
        maxWidth: "500px",
      }}
      className={isHeader ? undefined : "show-on-parent-hover"}
      contentClassName="p-1"
      style={
        ensureInfoBtnKeepsCardLayoutCellsConsistent ?
          {
            position: "absolute",
            top: "-.5em",
            right: 0,
            overflow: "visible",
          }
        : {}
      }
      button={
        !isHeader ?
          <Btn iconPath={mdiHelp} size="micro" />
        : <Btn
            iconPath={iconPath}
            className="Label_QuestionButton text-2  relative ai-center"
            title="Click for more information"
          />
      }
    >
      <div className="flex-row ta-left">
        <Icon
          path={mdiInformationOutline}
          size={1}
          className="f-0 text-2 mr-1"
        />
        {info}
      </div>
    </PopupMenu>
  );

  return (
    <label
      {...otherProps}
      className={classOverride(
        `Label variant:${variant} relative noselect flex-row ai-center ` +
          (toggle ? " pointer gap-p5 " : " gap-p25 ") +
          (otherProps.htmlFor ? " pointer " : " ") +
          "w-fit",
        className,
      )}
      style={{
        fontSize:
          size === "small" ? "12px"
          : isHeader ? "18px"
          : "16px",
        fontWeight:
          size === "small" ? "normal"
          : isHeader ? 500
          : 400,
        color: size === "small" ? "var(--text-1)" : "var(--text-1)",
        ...otherProps.style,
        ...(ensureInfoBtnKeepsCardLayoutCellsConsistent &&
          IconBtn && {
            paddingRight: "2em",
          }),
      }}
    >
      {isHeader && IconBtn}
      {leftIcon}
      {label ?? children}
      {toggle && (
        <Checkbox
          checked={toggle.checked}
          onChange={(v, c) => toggle.onChange(c)}
          variant="micro"
        />
      )}
      {!isHeader && IconBtn}
    </label>
  );
};
