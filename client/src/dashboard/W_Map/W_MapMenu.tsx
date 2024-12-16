import React from "react";

import {
  mdiCog,
  mdiLayersOutline,
  mdiMap,
  mdiPalette,
  mdiSyncCircle,
} from "@mdi/js";
import { FlexRow } from "../../components/Flex";
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
import Select from "../../components/Select/Select";
import { SwitchToggle } from "../../components/SwitchToggle";
import type { TabItem } from "../../components/Tabs";
import Tabs from "../../components/Tabs";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import type { ColumnConfig } from "../W_Table/ColumnMenu/ColumnMenu";
import { AutoRefreshMenu } from "../W_Table/TableMenu/AutoRefreshMenu";
import { ChartLayerManager } from "../WindowControls/ChartLayerManager";
import { MapBasemapOptions } from "./MapBasemapOptions";
import type { W_MapProps } from "./W_Map";
export const MAP_PROJECTIONS = ["mercator", "orthographic"] as const;

type ProstglesMapMenuProps = W_MapProps & {
  w: WindowSyncItem<"map">;
  bytesPerSec: number;
};

export const W_MapMenu = (props: ProstglesMapMenuProps) => {
  const { w } = props;

  let coloredCols: ColumnConfig[] = [];
  if (Array.isArray(w.columns)) {
    coloredCols = w.columns.filter((c) => c.style?.type !== "None");
  }

  let colorMenu: Record<string, TabItem> = {};
  if (coloredCols.length) {
    colorMenu = {
      Color: {
        leftIconPath: mdiPalette,
        content: (
          <Select
            label="Bin size"
            variant="div"
            className="w-fit b b-color mb-1"
            options={coloredCols.map(({ name }) => name)}
            value={w.options.colorField}
            onChange={(colorField: string) => {
              w.$update({ options: { colorField } }, { deepMerge: true });
            }}
          />
        ),
      },
    };
  }

  return (
    <Tabs
      variant="vertical"
      compactMode={window.isMobileDevice ? "hide-inactive" : undefined}
      contentClass="p-1"
      items={{
        "Data Refresh": {
          leftIconPath: mdiSyncCircle,
          style:
            (w.options.refresh?.type || "None") === "None" ?
              {}
            : { color: "var(--active)" },
          content: <AutoRefreshMenu w={w} />,
        },
        Basemap: {
          leftIconPath: mdiMap,
          content: <MapBasemapOptions w={w} prgl={props.prgl} />,
        },
        Layers: {
          leftIconPath: mdiLayersOutline,
          content: <ChartLayerManager {...props} type="map" />,
        },
        ...colorMenu,
        Settings: {
          leftIconPath: mdiCog,
          content: (
            <div className="flex-col gap-1">
              <FlexRow className="gap-2 ai-start">
                <Select
                  className="w-fit mt-p25"
                  label="Aggregation mode"
                  value={w.options.aggregationMode?.type ?? "wait"}
                  fullOptions={[
                    {
                      key: "limit",
                      label: "Limit",
                      subLabel:
                        "Will aggregate if the total number of features higher than specified",
                    },
                    {
                      key: "wait",
                      label: "Download time",
                      subLabel:
                        "Will aggregate/simplify if data load takes longer than specified",
                    },
                  ]}
                  onChange={(type) => {
                    w.$update(
                      { options: { aggregationMode: { type } } },
                      { deepMerge: true },
                    );
                  }}
                />
                {w.options.aggregationMode?.type === "limit" ?
                  <FormFieldDebounced
                    type="number"
                    style={{ width: "200px" }}
                    label="Result count limit"
                    value={w.options.aggregationMode.limit || 1000}
                    inputProps={{ min: 1, step: 1 }}
                    onChange={(e) => {
                      w.$update(
                        { options: { aggregationMode: { limit: +e } } },
                        { deepMerge: true },
                      );
                    }}
                  />
                : <FormFieldDebounced
                    type="number"
                    style={{ width: "200px" }}
                    label="Wait time in seconds"
                    hint={`Current connection is approx. ${(props.bytesPerSec / 1000).toFixed(1)} MB/s`}
                    value={w.options.aggregationMode?.wait ?? 2}
                    inputProps={{ min: 0 }}
                    onChange={(e) => {
                      w.$update(
                        { options: { aggregationMode: { wait: +e } } },
                        { deepMerge: true },
                      );
                    }}
                  />
                }
              </FlexRow>
              <SwitchToggle
                label={`Show Add/Edit shape button`}
                checked={!!w.options.showAddShapeBtn}
                onChange={(showAddShapeBtn) => {
                  w.$update(
                    { options: { showAddShapeBtn } },
                    { deepMerge: true },
                  );
                }}
              />
              <SwitchToggle
                label={`Hide layers button`}
                checked={!!w.options.hideLayersBtn}
                onChange={(hideLayersBtn) => {
                  w.$update(
                    { options: { hideLayersBtn } },
                    { deepMerge: true },
                  );
                }}
              />
              <SwitchToggle
                label={`Show row card on click`}
                checked={!!w.options.showCardOnClick}
                onChange={(showCardOnClick) => {
                  w.$update(
                    { options: { showCardOnClick } },
                    { deepMerge: true },
                  );
                }}
              />
            </div>
          ),
        },
      }}
    />
  );
};
