import { omitKeys, pickKeys } from "prostgles-types";
import React, { useState } from "react";
import type { TestSelectors } from "../Testing";
import { generateUniqueID } from "./FileInput/FileInput";
import { classOverride } from "./Flex";
import type { LabelProps } from "./Label";
import { Label } from "./Label";
import Loading from "./Loader/Loading";
import "./SwitchToggle.css";

export type SwitchToggleProps = TestSelectors & {
  title?: string;
  checked: boolean;
  onChange: (
    checked: boolean,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => Promise<void> | void;
  className?: string;
  style?: React.CSSProperties;
  disabledInfo?: string | false;
  variant?: "row" | "col" | "row-reverse";
  disableOnChangeDuringLoading?: boolean;
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
  disableOnChangeDuringLoading = true,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(false);
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
      ({
        variant: labelP.variant ?? "normal",
        className: classOverride(
          `text-1p5 noselect w-fit flex-row ai-center`,
          labelP.className,
        ),
        ...omitKeys(labelP, ["style", "className"]),
        style: { ...cursorStyle, ...labelP.style },
        htmlFor: disabledInfo ? undefined : id,
        ...testSelectors,
      } as LabelProps)
    );

  return (
    <label
      className={classOverride(
        `SwitchToggle flex-${variant} w-fit ai-${variant === "col" ? "start" : "center"} gap-p25 ${disabledInfo || (isLoading && disableOnChangeDuringLoading) ? "disabled " : ""}`,
        className,
      )}
      style={{
        ...cursorStyle,
        ...style,
        ...(disabledInfo && { opacity: 0.7 }),
        padding: "1px" /** to ensure active border stays visible */,
      }}
      role="switch"
      title={(disabledInfo ? disabledInfo : undefined) ?? title}
    >
      {labelProps && <Label {...labelProps} aria-checked={checked} />}
      <div
        className={`Switch-root rounded focusable ${checked ? "checked" : " "}`}
      >
        <span className={"SwitchBase-root "}>
          <input
            id={id}
            className="Switch-input"
            type="checkbox"
            checked={checked}
            disabled={!!disabledInfo}
            {...(!labelProps ? testSelectors : {})}
            onChange={
              disabledInfo ? undefined : (
                async (e) => {
                  if (isLoading && disableOnChangeDuringLoading) return;
                  const isPromise =
                    "then" in onChange && typeof onChange.then === "function";
                  if (isPromise) {
                    setIsLoading(true);
                  }
                  try {
                    await onChange(e.target.checked, e);
                  } finally {
                    setIsLoading(false);
                  }
                }
              )
            }
          />
          <span className={`Switch-thumb ${isLoading ? "loading" : ""}`}>
            {isLoading && (
              <Loading sizePx={21} style={{ color: "var(--blue)" }} />
            )}
          </span>
        </span>
        <span className={"Switch-track"}></span>
      </div>
    </label>
  );
};
