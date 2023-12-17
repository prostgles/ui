import React from "react"
import { SwitchToggle, SwitchToggleProps } from "../../../components/SwitchToggle"

export const RuleToggle = ({ checked, onChange }: Pick<SwitchToggleProps, "checked" | "onChange">) => {
  return <SwitchToggle 
    label={{ label: "Enabled", variant: "header" }}
    data-command="RuleToggle"
    checked={checked}
    onChange={onChange}
  />
}