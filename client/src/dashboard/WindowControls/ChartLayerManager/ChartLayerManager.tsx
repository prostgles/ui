import type { BtnProps } from "@components/Btn";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import { Select } from "@components/Select/Select";
import { mdiLayers } from "@mdi/js";
import React from "react";
import { MapBasemapOptions } from "../../W_Map/controls/MapBasemapOptions";
import { MapOpacityMenu } from "../../W_Map/controls/MapOpacityMenu";
import type { LayerQuery, W_MapProps } from "../../W_Map/W_Map";
import type {
  ProstglesTimeChartLayer,
  ProstglesTimeChartProps,
} from "../../W_TimeChart/W_TimeChart";
import { AddChartLayer } from "../AddChartLayer";
import { ChartLayerManagerLayer } from "./ChartLayerManagerLayer";
import { useSortedLayerQueries } from "./useSortedLayerQueries";

export type MapLayerManagerProps = (
  | ({
      type: "timechart";
      layerQueries: ProstglesTimeChartLayer[];
    } & ProstglesTimeChartProps)
  | ({
      type: "map";
    } & W_MapProps)
) & {
  asMenuBtn?: BtnProps<void>;
};

// TODO: Show columns grouped by their link
export const ChartLayerManager = (props: MapLayerManagerProps) => {
  const { myLinks, type, asMenuBtn, w } = props;

  const layerQueries = (props.layerQueries ?? []) as (
    | ProstglesTimeChartLayer
    | LayerQuery
  )[];
  const sortedLayerQueries = useSortedLayerQueries({ layerQueries, myLinks });
  const content = (
    <FlexCol>
      <FlexCol className="ChartLayerManager_LayerList">
        {sortedLayerQueries.map((lqRaw) => {
          return (
            <ChartLayerManagerLayer {...props} key={lqRaw._id} layer={lqRaw} />
          );
        })}
      </FlexCol>
      <FlexRow>
        <AddChartLayer {...props} />
        {type === "timechart" && (
          <Select
            className="ml-auto"
            label={"Y Scale mode"}
            asRow={true}
            value={w.options.yScaleMode ?? "multiple"}
            fullOptions={[
              {
                key: "single",
                label: "Single",
                subLabel: "Default (shared Y axis)",
              },
              {
                key: "multiple",
                label: "Multiple",
                subLabel: "Per layer (separate Y axis for each layer)",
              },
            ]}
            onChange={(yScaleMode) => {
              w.$update(
                {
                  options: { yScaleMode },
                },
                { deepMerge: true },
              );
            }}
          />
        )}
      </FlexRow>
      {type === "map" && (
        <FlexCol className="mt-2">
          <MapBasemapOptions {...props} asPopup={{ prgl: props.prgl }} />
          <MapOpacityMenu {...props} />
        </FlexCol>
      )}
    </FlexCol>
  );

  if (!asMenuBtn) {
    return content;
  }

  const title = "Manage layers";
  return (
    <PopupMenu
      title={title}
      data-command="ChartLayerManager"
      button={
        <Btn iconPath={mdiLayers} title={title} color="action" {...asMenuBtn} />
      }
      contentClassName="bg-color-1 p-1"
      render={() => content}
    />
  );
};
