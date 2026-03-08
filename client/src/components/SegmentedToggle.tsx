import { getEntries } from "@common/utils";
import Btn from "@components/Btn";
import { classOverride, FlexRow, type DivProps } from "@components/Flex";
import React from "react";

type SegmentedToggleProps<O extends string> = {
  value: string;
  options: Record<
    O,
    { title: string; iconPath: string; disabledInfo?: string }
  >;
  onChange: (value: O) => void;
} & DivProps;

export const SegmentedToggle = <O extends string>({
  onChange,
  value,
  className,
  options,
  ...divProps
}: SegmentedToggleProps<O>) => {
  return (
    <FlexRow
      {...divProps}
      className={
        "SegmentedToggle " +
        classOverride("rounded bg-color-3 gap-0", className)
      }
      style={{
        padding: "2px",
        ...divProps.style,
      }}
    >
      {getEntries(options).map(([key, { iconPath, title, disabledInfo }]) => {
        return (
          <Btn
            key={key}
            size="micro"
            title={title}
            disabledInfo={disabledInfo}
            variant={value === key ? "faded" : undefined}
            style={{
              background: value === key ? "var(--bg-color-0)" : "transparent",
            }}
            onClick={() => onChange(key)}
            iconPath={iconPath}
          />
        );
      })}
    </FlexRow>
  );
};
