import Btn from "@components/Btn";
import { FlexRowWrap } from "@components/Flex";
import { Label } from "@components/Label";
import {
  mdiClose,
  mdiEye,
  mdiEyeOff,
  mdiScript,
  mdiSetCenter,
  mdiTable,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import type { Link, LinkSyncItem } from "../../Dashboard/dashboardUtils";
import type { LayerQuery } from "../../W_Map/W_Map";
import type { ProstglesTimeChartLayer } from "../../W_TimeChart/W_TimeChart";
import { LayerColorPicker } from "../LayerColorPicker";
import { LayerFilterManager } from "../LayerFilterManager";
import { OSMLayerOptions } from "../OSMLayerOptions";
import { SQLChartLayerEditor } from "../SQLChartLayerEditor";
import { TimeChartLayerOptions } from "../TimeChartLayerOptions";
import type { MapLayerManagerProps } from "./ChartLayerManager";

type P = MapLayerManagerProps & {
  layer: NonNullable<
    (ProstglesTimeChartLayer | LayerQuery) & {
      link: LinkSyncItem;
    }
  >;
};
export const ChartLayerManagerLayer = (props: P) => {
  const { dbs, tables } = usePrgl();
  const { myLinks, layer, w, type, getLinksAndWindows } = props;

  const lq = layer as LayerQuery | ProstglesTimeChartLayer;
  const thisLink = myLinks.find((l) => l.id === lq.linkId);
  if (!thisLink || thisLink.options.type === "table") return null;
  let column = "";
  const isMap = type === "map";
  if (isMap) {
    const lq = layer as LayerQuery;
    column = lq.geomColumn;
  } else {
    const lq = layer as ProstglesTimeChartLayer;
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
        value: lq.type === "table" ? lq.tableName : lq.localTableName,
        path: lq.type === "table" ? lq.p : undefined,
        lq,
      };
  const isLocal = thisLink.w1_id === thisLink.w2_id;
  const layerDesc =
    lTypeInfo.type === "Table" ?
      `${lTypeInfo.path?.at(-1)?.table || lTypeInfo.value} (${column})`
    : lTypeInfo.value;
  return (
    <FlexRowWrap
      key={layer._id}
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
              : `${lTypeInfo.path?.length ? "Linked table" : "Table"}: ${[{ table: lTypeInfo.lq.tableName }, ...(lTypeInfo.path ?? [])].map((p) => p.table).join(" -> ")} (${column})`

            : <SQLChartLayerEditor link={thisLink} />
          }
          className={"ws-nowrap f-1 min-w-0"}
          title={lTypeInfo.type === "Table" ? `Table name` : "SQL Script"}
        >
          <div className="text-ellipsis">{layerDesc}</div>
        </Label>
      }

      <TimeChartLayerOptions
        w={w}
        getLinksAndWindows={getLinksAndWindows}
        link={thisLink}
        myLinks={myLinks}
        tables={tables}
        column={column}
      />

      <LayerFilterManager {...props} linkId={lq.linkId} />

      <Btn
        title="Toggle layer on/off"
        data-command="ChartLayerManager.toggleLayer"
        className={`ml-auto ${thisLink.disabled ? "" : "show-on-parent-hover"} `}
        iconPath={thisLink.disabled ? mdiEyeOff : mdiEye}
        color={"action"}
        onClick={() => {
          if (thisLink.options.type === "table") return;
          thisLink.$update({ disabled: !thisLink.disabled });
        }}
      />

      <Btn
        color="danger"
        title="Remove layer"
        data-command="ChartLayerManager.removeLayer"
        className="show-on-parent-hover"
        onClickPromise={async () => {
          if (thisLink.options.type === "table") return;
          const opts = thisLink.options;
          const newOpts: Link["options"] = {
            ...opts,
            columns: opts.columns.filter((c) => c.name !== column),
          };
          if (newOpts.columns.length === 0) {
            await dbs.links.update(
              { id: lq.linkId },
              { closed: true, last_updated: Date.now() },
            );
          } else {
            await thisLink.$update({ options: newOpts }, { deepMerge: true });
          }
        }}
        iconPath={mdiClose}
      />
    </FlexRowWrap>
  );
};
