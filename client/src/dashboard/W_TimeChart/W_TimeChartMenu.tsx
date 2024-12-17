import { mdiPanHorizontal, mdiSyncCircle } from "@mdi/js";
import React from "react";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { AutoRefreshMenu } from "../W_Table/TableMenu/AutoRefreshMenu";

type P = {
  w: WindowSyncItem<"timechart">;
  autoBinSize: string | undefined;
};

const BIN_LABEL_OPTIONS = [
  { key: "off", label: "Off" },
  { key: "all points", label: "All points" },
  { key: "latest point", label: "Last point" },
] as const;
export type ShowBinLabelsMode = (typeof BIN_LABEL_OPTIONS)[number]["key"];

const TooltipPositions = [
  { key: "auto", label: "Auto", subLabel: "Shows closest to the points" },
  { key: "top", label: "Top", subLabel: "Top of chart" },
  { key: "middle", label: "Middle", subLabel: "Middle of chart" },
  { key: "bottom", label: "Bottom", subLabel: "Bottom of chart" },
  { key: "hidden", label: "Hidden", subLabel: "No tooltip" },
] as const;
export type TooltipPosition = (typeof TooltipPositions)[number]["key"];

const MissingBinsOptions = [
  { key: "show 0", subLabel: "Empty bins will be shown as 0" },
  { key: "ignore", subLabel: "Lines will join existing points" },
  {
    key: "show nearest",
    subLabel: "Each missing bin will show the nearest existing bin",
  },
] as const;
export type MissingBinsOption = (typeof MissingBinsOptions)[number]["key"];

export const TimechartRenderStyles = [
  { key: "scatter plot", label: "Scatter plot" },
  { key: "line", label: "Line chart" },
  { key: "bars", label: "Bar chart" },
] as const;
export type TimechartRenderStyle =
  (typeof TimechartRenderStyles)[number]["key"];

export const ProstglesTimeChartMenu = ({ w, autoBinSize }: P) => {
  const {
    binSize = "auto",
    tooltipPosition = "auto",
    missingBins = "ignore",
    renderStyle = "line",
    showBinLabels = "off",
    binValueLabelMaxDecimals = null,
  } = w.options;

  const displayedBinSize =
    binSize === "auto" && autoBinSize !== undefined ?
      `Auto (${autoBinSize})`
    : TIMECHART_BIN_SIZES.find((o) => o.key === binSize)?.label;

  return (
    <FlexCol className="p-1">
      <Select
        className="w-fit"
        label="Bin size"
        value={
          binSize === "auto" && autoBinSize !== undefined ?
            `Auto (${autoBinSize})`
          : binSize
        }
        btnProps={{
          children: displayedBinSize,
          title: "Bin size",
          color: "action",
          iconPath: "", // mdiPanHorizontal,
        }}
        iconPath={mdiPanHorizontal}
        fullOptions={TIMECHART_BIN_SIZES}
        onChange={(binSize) => {
          w.$update({ options: { binSize } }, { deepMerge: true });
        }}
      />
      <Select
        label="Tooltip"
        value={tooltipPosition}
        fullOptions={TooltipPositions}
        onChange={(tooltipPosition) => {
          w.$update({ options: { tooltipPosition } }, { deepMerge: true });
        }}
      />

      <Select
        label="Chart style"
        value={renderStyle}
        fullOptions={TimechartRenderStyles}
        onChange={(renderStyle) => {
          w.$update({ options: { renderStyle } }, { deepMerge: true });
        }}
      />

      <FlexRow>
        <Select
          label="Show value labels"
          value={showBinLabels}
          fullOptions={BIN_LABEL_OPTIONS}
          onChange={(showBinLabels) => {
            w.$update({ options: { showBinLabels } }, { deepMerge: true });
          }}
        />
        <FormField
          label="Max decimals"
          value={binValueLabelMaxDecimals}
          disabledInfo={
            showBinLabels === "off" ?
              "Must enable 'Show value labels'"
            : undefined
          }
          nullable={true}
          style={{ maxWidth: "150px" }}
          inputProps={{ min: 0, max: 1e3, step: 1 }}
          onChange={(v) => {
            const binValueLabelMaxDecimals = v ? +v : v;
            w.$update(
              { options: { binValueLabelMaxDecimals } },
              { deepMerge: true },
            );
          }}
        />
      </FlexRow>

      {renderStyle === "line" && (
        <Select
          label="Missing bins"
          // disabledInfo={"No other modes supported at the moment"}
          value={missingBins}
          fullOptions={MissingBinsOptions}
          onChange={(missingBins) => {
            w.$update({ options: { missingBins } }, { deepMerge: true });
          }}
        />
      )}
      <PopupMenu
        onClickClose={false}
        button={
          <Btn
            variant="faded"
            color={
              w.options.refresh?.type === "Realtime" ? "action" : undefined
            }
            iconPath={mdiSyncCircle}
          >
            Data refresh
          </Btn>
        }
      >
        <AutoRefreshMenu w={w} />
      </PopupMenu>
    </FlexCol>
  );
};

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
export const TIMECHART_STAT_TYPES = [
  { label: "Count All", func: "$countAll" },
  { label: "Min", func: "$min" },
  { label: "Max", func: "$max" },
  { label: "Sum", func: "$sum" },
  { label: "Avg", func: "$avg" },
] as const;
export type StatType = (typeof TIMECHART_STAT_TYPES)[number]["label"];
