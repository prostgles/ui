import { getEntries } from "@common/utils";
import Btn, { type BtnProps } from "@components/Btn";
import { classOverride, FlexRow, type DivProps } from "@components/Flex";
import React from "react";

type SegmentedToggleProps<O extends string> = {
  value: O | undefined;
  options: Record<
    O,
    {
      title: string;
      children?: React.ReactNode;
      iconPath: string;
      disabledInfo?: string;
      size?: BtnProps["size"];
    }
  >;
  onChange: (value: O) => void;
} & Omit<DivProps, "onChange">;

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
      {getEntries(options).map(([key, btnProps]) => {
        return (
          <Btn
            key={key}
            size={"micro"}
            data-key={key}
            {...btnProps}
            variant={value === key ? "faded" : undefined}
            style={{
              background: value === key ? "var(--bg-color-0)" : "transparent",
            }}
            onClick={() => onChange(key)}
          />
        );
      })}
    </FlexRow>
  );
};
