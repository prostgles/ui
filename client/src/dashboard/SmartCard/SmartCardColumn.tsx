import React from "react";
import { classOverride } from "@components/Flex";
import { Label } from "@components/Label";
import type { ParsedFieldConfig } from "./SmartCard";

type SmartCardColumnProps = {
  className?: string;
  style?: React.CSSProperties;
  labelText: string | undefined | null;
  info: React.ReactNode | undefined;
  labelTitle: string | undefined;
  valueNode: React.ReactNode;
  renderMode: Exclude<ParsedFieldConfig["renderMode"], "full" | undefined>;
};
export const SmartCardColumn = ({
  labelText,
  className,
  style,
  info,
  labelTitle,
  valueNode,
  renderMode,
}: SmartCardColumnProps) => {
  const valueNodeWrapped = renderMode === "value";
  return (
    <div
      className={classOverride(
        "SmartCardCol flex-col o-auto ai-start text-1 ta-left ",
        className,
      )}
      style={{ maxHeight: "250px", ...style }}
    >
      {Boolean(labelText?.length) && (
        <Label size="small" variant="normal" title={labelTitle} info={info}>
          {labelText}
        </Label>
      )}
      {valueNodeWrapped ?
        <div className="font-16 text-0 o-auto">{valueNode}</div>
      : valueNode}
    </div>
  );
};
