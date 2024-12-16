import { mdiHelp, mdiInformationOutline } from "@mdi/js";
import React from "react";
import Btn from "./Btn";
import Checkbox from "./Checkbox";
import { Icon } from "./Icon/Icon";
import PopupMenu from "./PopupMenu";
import { classOverride } from "./Flex";
import "./Label.css";

export type NormalLabelProps = {
  /**
   * @default "normal"
   */
  variant: "normal";
  iconPath?: undefined;
  toggle?: {
    checked?: boolean;
    onChange: (checked: boolean) => void;
  };
};

export type HeaderLabelProps = {
  variant?: "header";
  iconPath?: string;
  toggle?: undefined;
};

export type LabelProps = React.DetailedHTMLProps<
  React.LabelHTMLAttributes<HTMLLabelElement>,
  HTMLLabelElement
> & {
  label?: string;
  info?: React.ReactNode;
  popupTitle?: React.ReactNode;
  size?: "small";
} & (NormalLabelProps | HeaderLabelProps);

export const Label = ({
  info,
  variant = "header",
  iconPath = mdiHelp,
  label,
  popupTitle,
  className = "",
  toggle,
  children,
  size,
  ...otherProps
}: LabelProps) => {
  const isHeader = variant === "header";
  let IconBtn: React.ReactNode = null;

  if (info) {
    IconBtn = (
      <PopupMenu
        title={popupTitle ?? label ?? "Information"}
        positioning="beneath-center"
        clickCatchStyle={{ opacity: 0.3 }}
        rootStyle={{
          maxWidth: "500px",
        }}
        className={isHeader ? undefined : "show-on-parent-hover"}
        contentClassName="p-1"
        button={
          !isHeader ?
            <Btn iconPath={mdiHelp} size="small" style={{ margin: "-8px" }} />
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
  }

  const labelNode = (
    <label
      {...otherProps}
      className={classOverride(
        " Label noselect flex-row ai-center " +
          (toggle ? " pointer gap-p5 " : " gap-1 ") +
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
      }}
    >
      {isHeader && IconBtn}
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

  return labelNode;
};
