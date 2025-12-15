import React from "react";
import { FlexRow } from "./Flex";
import type { TestSelectors } from "src/Testing";

export const StatusChip = ({
  text,
  color,
  ...testSelectors
}: {
  text: string;
  color: "yellow" | "red" | "green" | "blue" | "gray";
} & TestSelectors) => {
  return (
    <FlexRow
      {...testSelectors}
      className="gap-p25 px-p5 py-p25 "
      style={{
        backgroundColor: `var(--faded-${color})`,
        color: `var(--${color})`,
        borderRadius: "12px",
      }}
    >
      <div
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: `var(--${color})`,
        }}
      />
      <div>{text}</div>
    </FlexRow>
  );
};
