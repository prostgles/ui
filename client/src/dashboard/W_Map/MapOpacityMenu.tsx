import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import React from "react";
import { classOverride } from "../../components/Flex";
import { Slider } from "../../components/Slider";
import type { WindowData } from "../Dashboard/dashboardUtils";

type P = {
  w: SyncDataItem<Required<WindowData<"map">>, true>;
  className?: string;
};

export const MapOpacityMenu = ({ w, className }: P) => {
  const {
    basemapOpacity = 0.25,
    basemapDesaturate = 0,
    dataOpacity = 1,
  } = w.options;
  const updateOptions = (options: Partial<(typeof w)["options"]>) => {
    w.$update({ options }, { deepMerge: true });
  };

  return (
    <div className={classOverride("p-1 shadow bg-color-0 rounded", className)}>
      <Slider
        label={`Basemap opacity ${basemapOpacity.toFixed(1)}`}
        min={0}
        max={1}
        value={basemapOpacity}
        defaultValue={0.25}
        onChange={(opacity) => {
          updateOptions({ basemapOpacity: opacity });
        }}
      />
      <Slider
        label={`Basemap desaturate ${basemapDesaturate.toFixed(1)}`}
        min={-15}
        max={15}
        value={basemapDesaturate}
        defaultValue={0}
        onChange={(desaturate) => {
          updateOptions({ basemapDesaturate: desaturate });
        }}
      />

      <Slider
        label={`Data opacity ${dataOpacity.toFixed(1)}`}
        min={0.001}
        max={1}
        value={dataOpacity}
        defaultValue={0.5}
        onChange={(dataOpacity) => {
          updateOptions({ dataOpacity });
        }}
      />
    </div>
  );
};
