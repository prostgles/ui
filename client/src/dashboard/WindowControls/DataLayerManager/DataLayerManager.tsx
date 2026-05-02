import type { BtnProps } from "@components/Btn";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import Popup from "@components/Popup/Popup";
import { Select } from "@components/Select/Select";
import { mdiLayers } from "@mdi/js";
import React, { useState } from "react";
import type { LinkSyncItem } from "src/dashboard/Dashboard/dashboardUtils";
import { MapBasemapOptions } from "../../W_Map/controls/MapBasemapOptions";
import { MapOpacityMenu } from "../../W_Map/controls/MapOpacityMenu";
import type { LayerQuery, W_MapProps } from "../../W_Map/W_Map";
import type {
  ProstglesTimeChartLayer,
  W_TimeChartProps,
} from "../../W_TimeChart/W_TimeChart";
import { AddChartLayer } from "../AddChartLayer";
import { DataLayer } from "./DataLayer";
import { useSortedLayerQueries } from "./useSortedLayerQueries";

export type MapLayerManagerProps = (
  | ({
      type: "timechart";
      layerQueries: ProstglesTimeChartLayer[];
    } & Pick<W_TimeChartProps, "myLinks" | "w" | "getLinksAndWindows">)
  | ({
      type: "map";
    } & Pick<
      W_MapProps,
      "myLinks" | "w" | "getLinksAndWindows" | "layerQueries"
    >)
) & {
  asMenuBtn?: BtnProps<void>;
};

// TODO: Show columns grouped by their link
export const DataLayerManager = (props: MapLayerManagerProps) => {
  const { myLinks, type, asMenuBtn, w, layerQueries = [] } = props;
  const [popupAnchor, setPopupAnchor] = useState<HTMLButtonElement>();
  const [showLegend, setShowLegend] = useState(true);
  const sortedLayerQueries = useSortedLayerQueries({
    layerQueries,
    myLinks,
  });
  const content = (
    <FlexCol>
      <FlexCol className="ChartLayerManager_LayerList">
        {sortedLayerQueries.map((layer) => {
          if (props.type === "timechart") {
            return (
              <DataLayer
                {...props}
                type="timechart"
                key={layer._id}
                layer={
                  layer as ProstglesTimeChartLayer & { link: LinkSyncItem }
                }
              />
            );
          }
          return (
            <DataLayer
              {...props}
              type="map"
              key={layer._id}
              layer={layer as LayerQuery & { link: LinkSyncItem }}
            />
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
          <MapBasemapOptions {...props} asPopup={true} />
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
    <>
      {type === "map" && showLegend && (
        <FlexCol
          className="gap-p5 bg-color-0 p-p5 rounded shadow ws-nowrap"
          style={{ maxWidth: "200px" }}
        >
          {(layerQueries as LayerQuery[]).map((layer) => {
            return (
              <DataLayer
                {...props}
                type="map"
                asLegend={true}
                key={layer._id}
                layer={layer as LayerQuery & { link: LinkSyncItem }}
              />
            );
          })}
        </FlexCol>
      )}
      <Btn
        iconPath={mdiLayers}
        title={title}
        data-command={popupAnchor ? undefined : "ChartLayerManager"}
        color="action"
        {...asMenuBtn}
        onClick={({ currentTarget }) => setPopupAnchor(currentTarget)}
      />
      {popupAnchor && (
        <Popup
          title={title}
          data-command="ChartLayerManager"
          contentClassName="bg-color-1 p-1"
          anchorEl={popupAnchor}
          positioning="beneath-left"
          onClose={() => setPopupAnchor(undefined)}
        >
          {content}
        </Popup>
      )}
    </>
  );
};
