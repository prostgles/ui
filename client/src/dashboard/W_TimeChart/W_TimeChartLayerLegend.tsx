import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { mdiClose } from "@mdi/js";
import React from "react";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { ColorByLegend } from "../WindowControls/ColorByLegend/ColorByLegend";
import type { ChartLinkOptions } from "../WindowControls/DataLayerManager/DataLayer";
import { useSortedLayerQueries } from "../WindowControls/DataLayerManager/useSortedLayerQueries";
import { LayerColorPicker } from "../WindowControls/LayerColorPicker";
import { TimeChartLayerOptions } from "../WindowControls/TimeChartLayerOptions";
import type {
  ProstglesTimeChartLayer,
  W_TimeChartStateLayer,
} from "./W_TimeChart";

type P = Pick<CommonWindowProps, "getLinksAndWindows" | "myLinks"> & {
  layerQueries: ProstglesTimeChartLayer[];
  layers: W_TimeChartStateLayer[];
  onChanged: VoidFunction;
  w: WindowSyncItem<"timechart">;
};

export const W_TimeChartLayerLegend = ({
  layerQueries,
  layers,
  onChanged,
  ...props
}: P) => {
  const { w, myLinks } = props;

  const activeLayerQueries = useSortedLayerQueries({
    layerQueries,
    myLinks,
  }).filter((l) => !l.disabled);

  return (
    <ScrollFade className="W_TimeChartLayerLegend flex-row gap-1 min-w-0 o-auto no-scroll-bar">
      {activeLayerQueries.map(
        ({ _id, linkId, dateColumn, groupByColumn, link }) => {
          return (
            <FlexRow key={_id} className="W_TimeChartLayerLegend_Item gap-0">
              {!groupByColumn && (
                <LayerColorPicker
                  btnProps={{ style: { padding: 0 } }}
                  title={"layerDesc"}
                  column={dateColumn}
                  linkOptions={link.options as ChartLinkOptions}
                  onChange={(newOptions) => {
                    link.$update({ options: newOptions }, { deepMerge: true });
                  }}
                />
              )}

              <TimeChartLayerOptions
                w={w}
                getLinksAndWindows={props.getLinksAndWindows}
                link={link}
                myLinks={myLinks}
                column={dateColumn}
                mode="on-screen"
              />
              {groupByColumn && (
                <ColorByLegend
                  {...props}
                  className="ml-1"
                  layers={layers}
                  layerLinkId={linkId}
                  groupByColumn={groupByColumn}
                  onChanged={onChanged}
                />
              )}
              <Btn
                iconPath={mdiClose}
                size="micro"
                onClick={() => {
                  const isLastLayer = activeLayerQueries.length === 1;
                  link.$update({ closed: true, deleted: true });
                  if (isLastLayer && w.parent_window_id) {
                    w.$update({ closed: true, deleted: true });
                  }
                }}
              />
            </FlexRow>
          );
        },
      )}
    </ScrollFade>
  );
};
