export type ColumnValue = string | number | Date | null | undefined | boolean;

export const CONDITION_OPERATORS = [
  "=",
  "<=",
  "<",
  ">",
  ">=",
  "!=",
  "in",
  "not in",
  "contains",
  "not null",
  "null",
] as const;

type BasicConditionFilter = {
  operator: Exclude<(typeof CONDITION_OPERATORS)[number], "in" | "not in">;
  condition: ColumnValue;
};

type ConditionFilter =
  | BasicConditionFilter
  | {
      operator: "in" | "not in";
      condition: BasicConditionFilter["condition"][];
    };

export type ChipStyle = {
  textColor?: string;
  chipColor?: string;
  cellColor?: string;
  borderColor?: string;
};

export type ConditionalStyle = {
  type: "Conditional";
  column?: string;
  conditions: (ConditionFilter & ChipStyle)[];
  defaultStyle?: ChipStyle;
};
export type ConditionalStyleIcons = {
  type: "Icons";
  size?: number;
  valueToIconMap: Record<string, string>;
};
export type FixedStyle = {
  type: "Fixed";
} & ChipStyle;

export type ScaleStyle = {
  type: "Scale";
  textColor: string;
  minColor: string;
  maxColor: string;
};
export type BarchartStyle = {
  type: "Barchart";
  barColor: string;
  textColor: string;
};
