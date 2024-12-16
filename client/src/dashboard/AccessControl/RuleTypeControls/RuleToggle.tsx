import React from "react";
import type { SwitchToggleProps } from "../../../components/SwitchToggle";
import { SwitchToggle } from "../../../components/SwitchToggle";

export const RuleToggle = ({
  checked,
  onChange,
  disabledInfo,
}: Pick<SwitchToggleProps, "checked" | "onChange" | "disabledInfo">) => {
  return (
    <SwitchToggle
      label={{ label: "Enabled", variant: "header" }}
      data-command="RuleToggle"
      checked={checked}
      onChange={onChange}
      disabledInfo={disabledInfo}
    />
  );
};
