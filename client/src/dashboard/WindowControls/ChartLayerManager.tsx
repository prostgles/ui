import {
  mdiClose,
  mdiEye,
  mdiEyeOff,
  mdiLayers,
  mdiMap,
  mdiScript,
  mdiSetCenter,
  mdiTable,
} from "@mdi/js";
import React from "react";
import type { BtnProps } from "../../components/Btn";
import Btn from "../../components/Btn";
import { Label } from "../../components/Label";
import PopupMenu from "../../components/PopupMenu";
import type { Link, LinkSyncItem } from "../Dashboard/dashboardUtils";
import type { LayerQuery, W_MapProps } from "../W_Map/W_Map";
import type {
  ProstglesTimeChartLayer,
  ProstglesTimeChartProps,
} from "../W_TimeChart/W_TimeChart";
import { AddChartLayer } from "./AddChartLayer";
import { LayerColorPicker } from "./LayerColorPicker";
import { LayerFilterManager } from "./LayerFilterManager";
import { TimeChartLayerOptions } from "./TimeChartLayerOptions";
import { FlexCol, FlexRowWrap } from "../../components/Flex";
import { MapOpacityMenu } from "../W_Map/MapOpacityMenu";
import { MapBasemapOptions } from "../W_Map/MapBasemapOptions";
import { OSMLayerOptions } from "./OSMLayerOptions";
import { isDefined } from "../../utils";

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
  const {
    myLinks,
    prgl: { dbs },
    type,
    asMenuBtn,
    tables,
    getLinksAndWindows,
    w,
  } = props;
  const isMap = type === "map";

  const layerQueries = (props.layerQueries ?? []) as (
    | ProstglesTimeChartLayer
    | LayerQuery
  )[];
  const sortedLayerQueries = useSortedLayerQueries({ layerQueries, myLinks });
  const content = (
    <FlexCol className="gap-p5">
      <div className="flex-col gap-1">
        {sortedLayerQueries.map((lqRaw) => {
          const lq = lqRaw as LayerQuery | ProstglesTimeChartLayer;
          const thisLink = myLinks.find((l) => l.id === lq.linkId);
          if (!thisLink || thisLink.options.type === "table") return null;
          let column = "";

          if (isMap) {
            const lq = lqRaw as LayerQuery;
            column = lq.geomColumn;
          } else {
            const lq = lqRaw as ProstglesTimeChartLayer;
            column = lq.dateColumn;
          }

          const lTypeInfo =
            lq.type === "sql" ?
              {
                type: "SQL" as const,
                value: lq.sql,
              }
            : lq.type === "osm" ?
              {
                type: "OSM" as const,
                value: lq.query,
              }
            : {
                type: "Table" as const,
                value: lq.tableName,
                path: lq.path,
                lq,
              };
          const isLocal = thisLink.w1_id === thisLink.w2_id;
          const layerDesc =
            lTypeInfo.type === "Table" ?
              `${lTypeInfo.path?.at(-1)?.table || lTypeInfo.value} (${column})`
            : lTypeInfo.value;
          return (
            <FlexRowWrap
              key={lqRaw._id}
              className={`LayerQuery bg-color-0 ai-center gap-1 ta-left b b-color rounded ${window.isMobileDevice ? "p-p5" : "p-1"}`}
            >
              <LayerColorPicker
                title={layerDesc}
                column={column}
                link={thisLink}
                myLinks={myLinks}
                tables={tables}
                w={w}
                getLinksAndWindows={getLinksAndWindows}
              />

              {lTypeInfo.type === "OSM" ?
                <OSMLayerOptions link={thisLink} />
              : <Label
                  variant="header"
                  iconPath={
                    lTypeInfo.type === "Table" ?
                      isLocal ?
                        mdiTable
                      : mdiSetCenter
                    : mdiScript
                  }
                  info={
                    lTypeInfo.type === "Table" ?
                      isLocal ?
                        "Local table"
                      : `Linked table: ${[{ table: lTypeInfo.lq.tableName }, ...(lTypeInfo.path ?? [])].map((p) => p.table).join(" -> ")} (${column})`

                    : "SQL Script"
                  }
                  className={"ws-nowrap f-1 min-w-0"}
                  title={
                    lTypeInfo.type === "Table" ? `Table name` : "SQL Script"
                  }
                >
                  <div className="text-ellipsis">{layerDesc}</div>
                </Label>
              }

              <TimeChartLayerOptions
                w={w as any}
                getLinksAndWindows={getLinksAndWindows}
                link={thisLink}
                myLinks={myLinks}
                tables={tables}
                column={column}
              />

              <LayerFilterManager {...props} linkId={lq.linkId} />

              <Btn
                title="Toggle layer on/off"
                className={`ml-auto ${thisLink.disabled ? "" : "show-on-parent-hover"} `}
                iconPath={thisLink.disabled ? mdiEyeOff : mdiEye}
                color={"action"}
                onClick={() => {
                  if (thisLink.options.type === "table") return;
                  return thisLink.$update({ disabled: !thisLink.disabled });
                }}
              />

              <Btn
                color="danger"
                title="Remove layer"
                className="show-on-parent-hover"
                onClickPromise={async () => {
                  if (thisLink.options.type === "table") return;
                  const opts = thisLink.options;
                  const newOpts: Link["options"] = {
                    ...opts,
                    columns: opts.columns.filter((c) => c.name !== column),
                  };
                  if (newOpts.columns.length === 0) {
                    return dbs.links.update(
                      { id: lq.linkId },
                      { closed: true, last_updated: Date.now() },
                    );
                  }
                  return thisLink.$update(
                    { options: newOpts },
                    { deepMerge: true },
                  );
                }}
                iconPath={mdiClose}
              />
            </FlexRowWrap>
          );
        })}

        <AddChartLayer {...props} />
      </div>
      {props.type === "map" && (
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

type Args<T extends ProstglesTimeChartLayer | LayerQuery> = {
  layerQueries: T[];
  myLinks: LinkSyncItem[];
};
export const useSortedLayerQueries = <
  T extends ProstglesTimeChartLayer | LayerQuery,
>({
  layerQueries,
  myLinks,
}: Args<T>) => {
  return layerQueries
    .map((lq) => {
      const link = myLinks.find((l) => l.id === lq.linkId);
      if (!link) return undefined;
      return {
        ...lq,
        link,
      };
    })
    .filter(isDefined)
    .sort((a, b) => {
      return (
        new Date(a.link.created ?? 0).getTime() -
        new Date(b.link.created ?? 0).getTime()
      );
    });
};
