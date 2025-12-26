import React from "react";
import type { LinkSyncItem } from "../Dashboard/dashboardUtils";
import PopupMenu from "@components/PopupMenu";
import Btn from "@components/Btn";
import { mdiMap } from "@mdi/js";
import { OverpassQuery } from "../W_Map/OSM/OverpassQuery";
import { isDefined } from "../../utils/utils";
import { FlexRow } from "@components/Flex";
import { getRandomColor } from "../Dashboard/PALETTE";

type P = {
  link: LinkSyncItem;
};
export const OSMLayerOptions = ({ link }: P) => {
  const opts = link.options;
  if (opts.type !== "map") return null;
  const query = opts.osmLayerQuery;
  if (!isDefined(query)) return null;
  return (
    <PopupMenu
      showFullscreenToggle={{}}
      title="OSM Layer Options"
      button={
        <FlexRow>
          <Btn title="Edit Overpass Query" iconPath={mdiMap} />
          <div
            className="f-1 text-ellipsis text-1 font-18"
            style={{ fontWeight: 500 }}
          >
            {query}
          </div>
        </FlexRow>
      }
      onClickClose={false}
    >
      <OverpassQuery
        query={query}
        onChange={(osmLayerQuery) => {
          link.$update(
            {
              options: {
                osmLayerQuery,
                mapColorMode: {
                  type: "fixed",
                  colorArr: getRandomColor(1),
                },
              },
            },
            { deepMerge: true },
          );
        }}
      />
    </PopupMenu>
  );
};
