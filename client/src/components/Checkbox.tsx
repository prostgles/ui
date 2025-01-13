import { mdiCheckBold } from "@mdi/js";
import React from "react";
import "./Checkbox.css";
import { classOverride } from "./Flex";
import type { TestSelectors } from "../Testing";
import { Icon } from "./Icon/Icon";

type P = TestSelectors & {
  id?: string;
  style?: React.CSSProperties;
  className?: string;
  inputClassname?: string;
  checked?: boolean;
  label?: React.ReactNode;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>, checked: boolean) => any;
  readOnly?: boolean;
  title?: string;
  variant?: "minimal" | "micro" | "button";
};

export default class Checkbox extends React.Component<P, any> {
  inptRef?: HTMLInputElement;
  render() {
    const props = { ...this.props };
    const {
      id,
      className = "",
      inputClassname = "",
      label,
      checked,
      style = {},
      onChange,
      readOnly,
      title,
      variant,
      // children,
      ...testSel
    } = props;

    const isBtn = variant === "button";
    const isMiniOrMicro = variant === "minimal" || variant === "micro";
    const tickColorClass = checked ? " text-action " : "text-2";
    const tickClass = isMiniOrMicro || isBtn ? tickColorClass : "text-action";
    const tickStyle =
      isMiniOrMicro || isBtn ?
        {}
      : {
          opacity: checked ? 1 : 0,
        };

    const defaultInputClass =
      " Checkbox_inner_label flex-row-wrap noselect relative checkbox pointer ai-center jc-center w-fit w-fit h-fit input-bg-color " +
      (!variant ? " b b-color " : "") +
      (variant === "micro" ? ""
      : variant === "minimal" ? " round "
      : " focusable ") +
      (isBtn ? "bg-color-2 b-gray-100 p-p5 no-outline"
      : isMiniOrMicro ? "bg-transparent b-unset no-outline"
      : "relative ");
    const checkbox = (
      <div
        className={classOverride(defaultInputClass, inputClassname)}
        tabIndex={0}
        style={
          variant ?
            {}
          : {
              padding: "3px",
              borderRadius: "3px",
            }
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            this.inptRef?.click();
          }
        }}
      >
        <input
          id={id}
          ref={(e) => {
            if (e) this.inptRef = e;
          }}
          className="hidden"
          type="checkbox"
          checked={checked}
          onChange={
            !onChange ? undefined : (
              (e) => {
                onChange(e, e.target.checked);
              }
            )
          }
          readOnly={readOnly}
        />
        <Icon
          path={mdiCheckBold}
          size={
            variant === "button" ? 1
            : variant === "minimal" ?
              1
            : 0.75
          }
          className={tickClass}
          style={tickStyle}
        />
      </div>
    );

    return (
      <label
        style={{
          ...style,
          ...(isMiniOrMicro ?
            {
              background: "transparent",
              outline: "none !important",
            }
          : {}),
        }}
        htmlFor={id}
        className={classOverride(
          "Checkbox flex-row-wrap ai-center pointer w-fit h-fit",
          className,
        )}
        title={title}
        {...testSel}
      >
        {checkbox}
        {!label ? null : (
          <div
            className={`ml-1 noselect f-1 text-ellipsis ${tickColorClass} ${isMiniOrMicro ? "ml-p25" : "ml-p5"}`}
          >
            {label}
          </div>
        )}
      </label>
    );
  }
}
