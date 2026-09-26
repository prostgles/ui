import type {
  DetailedFilter,
  GroupedDetailedFilter,
} from "@common/filterUtils";
import type { BtnProps } from "@components/Btn";
import type { ParsedJoinPath, ValidatedColumnInfo } from "prostgles-types";
import type {
  TimechartRenderStyle,
  TIMECHART_STAT_TYPES,
} from "src/dashboard/W_TimeChart/W_TimeChartMenu";
import type { ColumnConfigWithInfo } from "../W_Table";
import type { UserColumnFormat } from "./ColumnDisplayFormat/columnFormatUtils";
import type {
  ConditionalStyle,
  ConditionalStyleIcons,
  FixedStyle,
  ScaleStyle,
  BarchartStyle,
} from "./ColumnStyleControls/ColumnStyleControls";
import type { FuncDef } from "./FunctionSelector/functions";

export type ColumnConfigChart = {
  type: "timechart";
  dateCol: string;
  renderStyle: TimechartRenderStyle | "smooth-line";
  yAxis:
    | {
        isCountAll: false;
        colName: string;
        funcName: (typeof TIMECHART_STAT_TYPES)[number]["func"];
      }
    | {
        isCountAll: true;
      };
};

export type NestedColumn<C extends ColumnConfig | ColumnConfigWithInfo> = Omit<
  C,
  "nested"
> & { nested?: never };

export type ColumnAction =
  | { type: "record" }
  /** Uses the relationship, aggregate filter and clicked group. */
  | { type: "relatedRecords" };

export type ColumnStyle = (
  | { type?: "None" }
  | ConditionalStyle
  | ConditionalStyleIcons
  | FixedStyle
  | ScaleStyle
  | BarchartStyle
) & {
  /** Colours come from the same fixed/conditional style as plain values. */
  buttonVariant?: Extract<
    BtnProps["variant"],
    "text" | "faded" | "filled" | "outline"
  >;
};

export type NestedDisplay =
  | { type: "values"; labels?: "auto" | "none" | "inline" | "above" }
  | { type: "entities" }
  | ColumnConfigChart;

export type NestedColumnConfig = {
  path: ParsedJoinPath[];
  columns: NestedColumn<ColumnConfig>[];
  joinType?: "inner" | "left";
  limit?: number;
  sort?: ColumnSort;
  detailedFilter?: DetailedFilter[];
  detailedHaving?: DetailedFilter[];
  /** Defaults to values, with labels omitted for a single shown column. */
  display?: NestedDisplay;
};

export type ColumnConfig = {
  idx?: number;
  name: string;
  show?: boolean;
  width?: number;
  label?: string;
  nested?: NestedColumnConfig;
  style?: ColumnStyle;
  format?: UserColumnFormat;
  /** Omit to keep the format's own behaviour without added navigation. */
  action?: ColumnAction;
  computedConfig?: ComputedColumnConfig;
};

export type ComputedColumnConfig = Pick<
  ValidatedColumnInfo,
  "tsDataType" | "udt_name"
> & {
  /**
   * If true then this (name === computedConfig.column) represents an actual column and should not be removed
   */
  isColumn?: boolean;

  funcDef: Omit<FuncDef, "outType">;

  /**
   * Undefined for functions that don't need any columns
   */
  column: string | undefined;
  args?: {
    $duration?: { otherColumn: string };
    $string_agg?: { separator: string };
    $template_string?: string;
  };
  aggregateOptions?: AggregateOptions;
};

export type ColumnSortSQL = {
  key: string | number;
  asc?: boolean | null;
  nulls?: "first" | "last" | null;
  nullEmpty?: boolean;
};
export type ColumnSort = Omit<ColumnSortSQL, "key"> & {
  key: string;
};

export type AggregateOptions = {
  filter?: GroupedDetailedFilter;
  orderBy?: ColumnSort;
};
