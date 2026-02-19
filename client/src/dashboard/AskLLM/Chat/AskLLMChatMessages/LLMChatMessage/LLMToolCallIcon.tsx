import { SvgIcon } from "@components/SvgIcon";
import React from "react";

export const LLMToolCallIcon = ({ iconName }: { iconName: string }) => {
  return (
    <SvgIcon
      icon={iconName}
      style={{ margin: "-4px", flex: "none" }}
      size={20}
    />
  );
};
