import Btn from "@components/Btn";
import { classOverride, FlexRow } from "@components/Flex";
import { includes } from "prostgles-types";
import React from "react";
import { TABLE_RULE_TYPES } from "./TableAccessEditor";

export const VIEW_MODES = ["Overview", ...TABLE_RULE_TYPES] as const;
export type ViewMode = (typeof VIEW_MODES)[number];
export const ViewModeToggle = ({
  onChange,
  value,
  className,
  allowedValues,
}: {
  className?: string;
  value: ViewMode;
  allowedValues: Exclude<ViewMode, "Overview">[];
  onChange: (value: ViewMode) => void;
}) => {
  return (
    <FlexRow
      className={classOverride("rounded bg-color-3 gap-0", className)}
      style={{
        padding: "2px",
      }}
    >
      {VIEW_MODES.map((mode) => {
        return (
          <Btn
            key={mode}
            size="micro"
            title={mode}
            disabledInfo={
              mode !== "Overview" && !includes(allowedValues, mode) ?
                "No permissions defined for this mode"
              : undefined
            }
            variant={value === mode ? "faded" : undefined}
            style={{
              background: value === mode ? "var(--bg-color-0)" : "transparent",
            }}
            onClick={() => onChange(mode)}
          >
            {mode}
          </Btn>
        );
      })}
      {/* <Btn
        size="micro"
        title="Command view"
        iconPath={mdiShieldLockOutline}
        color="indigo"
        variant={value === "rules" ? "faded" : undefined}
        style={{
          background: value === "rules" ? "var(--bg-color-0)" : "transparent",
        }}
        onClick={() => onChange("rules")}
      />
      <Btn
        size="micro"
        title="Columns view"
        iconPath={mdiTableColumnWidth}
        style={{
          background: value === "columns" ? "var(--bg-color-0)" : "transparent",
        }}
        variant={value === "columns" ? "faded" : undefined}
        onClick={() => onChange("columns")}
      /> */}
    </FlexRow>
  );
};
