import type { CardLayoutOptions } from "@common/ColumnConfig/cardLayout";
import type { CSSProperties } from "react";

export const getCardLayoutStyle = (
  layout: CardLayoutOptions | undefined,
): CSSProperties => {
  if (layout?.type !== "grid") return {};
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${positiveInteger(layout.columns, 2)}, minmax(0, 1fr))`,
    alignItems: "start",
  };
};

export const getCardFieldLayout = (
  layout: CardLayoutOptions | undefined,
  field: NonNullable<CardLayoutOptions["fields"]>[string] | undefined,
  hideLabel: boolean,
) => {
  const labels =
    field?.labels ?? layout?.labels ?? (hideLabel ? "none" : "above");
  const style: CSSProperties = {
    ...(layout?.type === "grid" && {
      minWidth: 0,
      maxWidth: "100%",
      gridColumn: `span ${Math.min(positiveInteger(field?.columnSpan, 1), positiveInteger(layout.columns, 2))}`,
      gridRow: field?.row ? positiveInteger(field.row, 1) : undefined,
    }),
    ...(labels === "inline" && {
      flexDirection: "row",
      alignItems: "baseline",
      gap: ".5em",
    }),
  };
  return { hideLabel: labels === "none", style };
};

const positiveInteger = (value: number | undefined, fallback: number) =>
  value && Number.isInteger(value) && value > 0 ? value : fallback;
