import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import React from "react";
import type { LinkSyncItem, WindowData } from "../Dashboard/dashboardUtils";
import type { RGBA } from "../W_Table/ColumnMenu/ColorPicker";
import { ColorPicker } from "../W_Table/ColumnMenu/ColorPicker";
import type { MapLayerManagerProps } from "./ChartLayerManager";
import { MapLayerStyling } from "./MapLayerStyling";
import type { BtnProps } from "../../components/Btn";

export type LayerColorPickerProps = {
  link: LinkSyncItem;
  column: string;
  myLinks: LinkSyncItem[];
  title?: string;
  w:
    | SyncDataItem<Required<WindowData<"timechart">>, true>
    | SyncDataItem<Required<WindowData<"map">>, true>;
  btnProps?: BtnProps;
} & Pick<MapLayerManagerProps, "tables" | "w" | "getLinksAndWindows">;

export const LayerColorPicker = ({
  link,
  column,
  myLinks,
  title,
  tables,
  w,
  getLinksAndWindows,
  btnProps,
}: LayerColorPickerProps) => {
  if (link.options.type === "table") {
    return null;
  }
  const rgba: RGBA =
    link.options.columns.find((c) => c.name === column)?.colorArr ??
    ([100, 100, 100] as any);
  const opts = link.options;

  if (opts.type === "map") {
    return (
      <MapLayerStyling
        linkOptions={opts}
        myLinks={myLinks}
        link={link}
        tables={tables}
        w={w}
        getLinksAndWindows={getLinksAndWindows}
        column={column}
        title={title}
      />
    );
  }

  return (
    <ColorPicker
      style={{ flex: "none" }}
      btnProps={btnProps}
      title={title}
      required={true}
      className="w-fit m-p5 text-2"
      value={`rgba(${rgba})`}
      onChange={(colorStr, colorArr) => {
        const thisLink = myLinks.find((l) => l.id === link.id);
        if (thisLink && thisLink.options.type !== "table") {
          const opts = thisLink.options;
          thisLink.$update(
            {
              options: {
                ...opts,
                columns: opts.columns.map((c) => ({
                  ...c,
                  colorArr: c.name === column ? colorArr : c.colorArr,
                })),
              },
            },
            { deepMerge: true },
          );
        }
      }}
    />
  );
};
