import "./SwitchToggle.css";
import * as React from "react";
import { generateUniqueID } from "./FileInput/FileInput";
import { classOverride } from "./Flex";
import type { LabelProps } from "./Label";
import { Label } from "./Label";
import type { TestSelectors } from "../Testing";
import { omitKeys, pickKeys } from "prostgles-types";

export type SwitchToggleProps = TestSelectors & {
  title?: string;
  checked: boolean;
  onChange: (checked: boolean, e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  disabledInfo?: string | false;
  variant?: "row" | "col" | "row-reverse";
  label?: string | LabelProps;
};

export const SwitchToggle: React.FC<SwitchToggleProps> = ({
  id = generateUniqueID(),
  checked,
  onChange,
  label,
  style,
  title = "",
  className = "",
  disabledInfo,
  variant = "row-reverse",
  ...props
}) => {
  const cursorStyle = {
    cursor: disabledInfo ? "not-allowed" : "pointer",
  };
  const testSelectors = pickKeys(props, ["data-key", "data-command"]);
  const labelP: LabelProps =
    typeof label === "string" ? { label }
    : label ? label
    : {};
  const labelProps: LabelProps | undefined =
    !label ? undefined : (
      {
        variant: labelP.variant ?? "normal",
        className: classOverride(
          `text-1p5 noselect w-fit flex-row ai-center`,
          labelP.className,
        ),
        ...(omitKeys(labelP, ["style", "className"]) as any),
        style: { ...cursorStyle, ...labelP.style },
        htmlFor: disabledInfo ? undefined : id,
        ...testSelectors,
      }
    );

  return (
    <div
      className={classOverride(
        `SwitchToggle flex-${variant} w-fit ai-${variant === "col" ? "start" : "center"} gap-p25 ${disabledInfo ? "disabled " : ""}`,
        className,
      )}
      style={{
        ...cursorStyle,
        ...style,
        ...(disabledInfo && { opacity: 0.7 }),
        padding: "1px" /** to ensure active border stays visible */,
      }}
      title={(disabledInfo ? disabledInfo : undefined) ?? title}
    >
      {labelProps && <Label {...labelProps} />}
      <div
        className={
          "Switch-root rounded focusable " + (checked ? " checked" : " ")
        }
      >
        <span className={"SwitchBase-root "}>
          <input
            id={id}
            className="Switch-input"
            type="checkbox"
            checked={checked}
            disabled={!!disabledInfo}
            onChange={(e) =>
              disabledInfo ? undefined : onChange(e.target.checked, e)
            }
          />
          <span className={"Switch-thumb "}></span>
        </span>
        <span className={"Switch-track"}></span>
      </div>
    </div>
  );
};
