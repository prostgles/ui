export const TIMECHART_RENDER_STYLE_OPTIONS = [
  { key: "scatter plot", label: "Scatter plot" },
  { key: "line", label: "Line chart" },
  { key: "smooth", label: "Smooth line chart" },
  { key: "bars", label: "Bar chart" },
] as const;
export type TimechartRenderStyle =
  (typeof TIMECHART_RENDER_STYLE_OPTIONS)[number]["key"];

export const TIMECHART_STAT_TYPES = [
  { label: "Count All", func: "$countAll" },
  { label: "Count", func: "$count" },
  { label: "Min", func: "$min" },
  { label: "Max", func: "$max" },
  { label: "Sum", func: "$sum" },
  { label: "Avg", func: "$avg" },
] as const;

export const TIMECHART_BIN_SIZES = [
  { key: "auto", label: "Auto" },
  { key: "year", label: "1 Year" },
  { key: "month", label: "1 Month" },
  { key: "week", label: "1 Week" },
  { key: "day", label: "1 Day" },
  { key: "8hour", label: "8 Hours" },
  { key: "4hour", label: "4 Hours" },
  { key: "2hour", label: "2 Hours" },
  { key: "hour", label: "1 Hour" },
  { key: "30minute", label: "30 Minutes" },
  { key: "15minute", label: "15 Minutes" },
  { key: "5minute", label: "5 Minutes" },
  { key: "minute", label: "1 Minute" },
  { key: "30second", label: "30 Seconds" },
  { key: "15second", label: "15 Seconds" },
  { key: "5second", label: "5 Seconds" },
  { key: "second", label: "1 Second" },
  { key: "millisecond", label: "1 Millisecond" },
  { key: "5millisecond", label: "5 Milliseconds" },
  { key: "10millisecond", label: "10 Milliseconds" },
  { key: "100millisecond", label: "100 Milliseconds" },
  { key: "250millisecond", label: "250 Milliseconds" },
  { key: "500millisecond", label: "500 Milliseconds" },

  // "Auto", "1 second", "1 minute", "1 hour", "1 day", "1 week", "1 month", "1 year", "5 years", "10 years"
] as const;

export type TimeChartBinSize = (typeof TIMECHART_BIN_SIZES)[number]["key"];

export type StatType = (typeof TIMECHART_STAT_TYPES)[number]["label"];
export type StatFunction = (typeof TIMECHART_STAT_TYPES)[number]["func"];

export const TIMECHART_BIN_LABELS = [
  { key: "off", label: "Off" },
  { key: "all points", label: "All points" },
  { key: "peaks and troughs", label: "Peaks and troughs" },
  { key: "latest point", label: "Last point" },
] as const;
export type ShowBinLabelsMode = (typeof TIMECHART_BIN_LABELS)[number]["key"];

export const TIMECHART_TOOLTIP_POSITION_OPTIONS = [
  { key: "auto", label: "Auto", subLabel: "Shows closest to the points" },
  { key: "top", label: "Top", subLabel: "Top of chart" },
  { key: "middle", label: "Middle", subLabel: "Middle of chart" },
  { key: "bottom", label: "Bottom", subLabel: "Bottom of chart" },
  { key: "hidden", label: "Hidden", subLabel: "No tooltip" },
] as const;
export type TooltipPosition =
  (typeof TIMECHART_TOOLTIP_POSITION_OPTIONS)[number]["key"];

export const TIMECHART_MISSING_BIN_OPTIONS = [
  { key: "show 0", subLabel: "Empty bins will be shown as 0" },
  { key: "ignore", subLabel: "Lines will join existing points" },
  {
    key: "show nearest",
    subLabel: "Each missing bin will show the nearest existing bin",
  },
] as const;
export type MissingBinsOption =
  (typeof TIMECHART_MISSING_BIN_OPTIONS)[number]["key"];
