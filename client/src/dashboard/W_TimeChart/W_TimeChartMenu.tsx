import {
  TIMECHART_MISSING_BIN_OPTIONS,
  TIMECHART_BIN_LABELS,
  TIMECHART_BIN_SIZES,
  TIMECHART_RENDER_STYLE_OPTIONS,
  TIMECHART_TOOLTIP_POSITION_OPTIONS,
} from "@common/ColumnConfig/timechartConstants";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import PopupMenu from "@components/PopupMenu";
import { Select } from "@components/Select/Select";
import { SwitchToggle } from "@components/SwitchToggle";
import { mdiPanHorizontal, mdiSyncCircle } from "@mdi/js";
import React from "react";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { includes } from "../W_SQL/W_SQLBottomBar/W_SQLBottomBar";
import { AutoRefreshMenu } from "../W_Table/TableMenu/AutoRefreshMenu";

type P = {
  w: WindowSyncItem<"timechart">;
  autoBinSize: string | undefined;
};

export const ProstglesTimeChartMenu = ({ w, autoBinSize }: P) => {
  const {
    binSize = "auto",
    tooltipPosition = "auto",
    missingBins = "ignore",
    renderStyle = "line",
    showBinLabels = "off",
    showGradient = true,
    binValueLabelMaxDecimals = null,
  } = w.options;

  const displayedBinSize =
    binSize === "auto" && autoBinSize !== undefined ?
      `Auto (${autoBinSize})`
    : TIMECHART_BIN_SIZES.find((o) => o.key === binSize)?.label;

  return (
    <FlexCol className="p-1">
      <FormField
        type="text"
        label={"Name"}
        value={w.name || ""}
        onChange={(newTitle) => {
          w.$update({ name: newTitle });
        }}
      />
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
        fullOptions={TIMECHART_TOOLTIP_POSITION_OPTIONS}
        onChange={(tooltipPosition) => {
          w.$update({ options: { tooltipPosition } }, { deepMerge: true });
        }}
      />
      <FlexRow>
        <Select
          label="Chart style"
          value={renderStyle}
          fullOptions={TIMECHART_RENDER_STYLE_OPTIONS}
          onChange={(renderStyle) => {
            w.$update({ options: { renderStyle } }, { deepMerge: true });
          }}
        />
        {includes(renderStyle, ["line", "smooth"]) && (
          <SwitchToggle
            label={"Show gradient"}
            checked={showGradient}
            variant="col"
            onChange={(showGradient) => {
              w.$update({ options: { showGradient } }, { deepMerge: true });
            }}
          />
        )}
      </FlexRow>

      <FlexRow>
        <Select
          label="Show value labels"
          value={showBinLabels}
          fullOptions={TIMECHART_BIN_LABELS}
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
          fullOptions={TIMECHART_MISSING_BIN_OPTIONS}
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
