import type { DBSSchema } from "@common/publishUtils";
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
import React, { useCallback } from "react";
import { RenderFilter } from "src/dashboard/RenderFilter";
import type { Link, LinkSyncItem } from "../../Dashboard/dashboardUtils";
import type { LayerQuery, W_MapProps } from "../../W_Map/W_Map";
import type {
  ProstglesTimeChartLayer,
  W_TimeChartProps,
} from "../../W_TimeChart/W_TimeChart";
import { LayerColorPicker } from "../LayerColorPicker";
import { OSMLayerOptions } from "../OSMLayerOptions";
import { SQLChartLayerEditor } from "../SQLChartLayerEditor";
import { TimeChartLayerOptions } from "../TimeChartLayerOptions";
import type { MapLayerManagerProps } from "./DataLayerManager";

export type ChartLinkOptions = Exclude<
  DBSSchema["links"]["options"],
  { type: "table" }
>;
type P =
  | (Pick<W_TimeChartProps, "w" | "getLinksAndWindows" | "myLinks"> & {
      type: "timechart";
      layer: NonNullable<
        ProstglesTimeChartLayer & {
          link: LinkSyncItem;
        }
      >;
    })
  | (Pick<W_MapProps, "w" | "getLinksAndWindows" | "myLinks"> & {
      type: "map";
      w: MapLayerManagerProps["w"];
      layer: NonNullable<
        LayerQuery & {
          link: LinkSyncItem;
        }
      >;
    });
export const DataLayer = (props: P) => {
  const { tables, db } = usePrgl();
  const { myLinks, layer, w, getLinksAndWindows } = props;

  const thisLink = myLinks.find((l) => l.id === layer.linkId);
  const linkOptions = thisLink?.options;
  if (!linkOptions || linkOptions.type === "table") return null;

  const { dataSource } = linkOptions;

  const tableName =
    props.layer.type === "table" ? props.layer.tableName
    : props.layer.type === "local-table" ? props.layer.localTableName
    : undefined;
  const joinPath =
    dataSource?.type === "table" ? dataSource.joinPath : undefined;
  const column =
    props.type === "map" ? props.layer.geomColumn : props.layer.dateColumn;
  const osmOrSQLQuery =
    dataSource?.type === "osm" ? dataSource.osmLayerQuery
    : dataSource?.type === "sql" ? dataSource.sql
    : undefined;
  const layerDesc =
    osmOrSQLQuery ?? `${joinPath?.at(-1)?.table || tableName} (${column})`;

  const updateOptions = useCallback(
    (newOptions: ChartLinkOptions) => {
      if (thisLink.options.type === "table") return;
      thisLink.$update(
        {
          options: newOptions,
        },
        { deepMerge: true },
      );
    },
    [thisLink],
  );
  return (
    <FlexRowWrap
      key={layer._id}
      className={`LayerQuery bg-color-0 ai-center gap-1 ta-left b b-color rounded ${window.isMobileDevice ? "p-p5" : "p-1"}`}
    >
      <LayerColorPicker
        onChange={updateOptions}
        title={layerDesc}
        column={column}
        linkOptions={linkOptions}
      />

      {dataSource?.type === "osm" ?
        <OSMLayerOptions link={thisLink} dataSource={dataSource} />
      : <Label
          variant="header"
          iconPath={
            dataSource?.type === "local-table" ? mdiTable
            : dataSource?.type === "table" ?
              mdiSetCenter
            : mdiScript
          }
          info={
            dataSource?.type === "local-table" ? "Local table"
            : dataSource?.type === "table" ?
              `${dataSource.joinPath?.length ? "Linked table" : "Table"}: ${[{ table: tableName }, ...(dataSource.joinPath ?? [])].map((p) => p.table).join(" -> ")} (${column})`
            : <SQLChartLayerEditor link={thisLink} />
          }
          className={"ws-nowrap f-1 min-w-0"}
          title={
            dataSource?.type === "table" || dataSource?.type === "local-table" ?
              `Table name`
            : "SQL Script"
          }
        >
          <div className="text-ellipsis">{layerDesc}</div>
        </Label>
      }

      <TimeChartLayerOptions
        w={w}
        getLinksAndWindows={getLinksAndWindows}
        link={thisLink}
        myLinks={myLinks}
        column={column}
      />

      {dataSource?.type === "local-table" && (
        <RenderFilter
          db={db}
          tables={tables}
          title="Manage filters"
          mode="micro"
          selectedColumns={undefined}
          itemName="filter"
          tableName={dataSource.localTableName}
          contextData={undefined}
          filter={dataSource.smartGroupFilter}
          onChange={(andOrFilter) => {
            updateOptions({
              ...linkOptions,
              dataSource: {
                ...dataSource,
                smartGroupFilter: andOrFilter,
              },
            });
          }}
        />
      )}

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
        onClickPromise={() => {
          if (thisLink.options.type === "table") return;
          const opts = thisLink.options;
          const newOpts: Link["options"] = {
            ...opts,
            columns: opts.columns.filter((c) => c.name !== column),
          };
          if (newOpts.columns.length === 0) {
            thisLink.$update({ closed: true });
          } else {
            updateOptions(newOpts);
          }
        }}
        iconPath={mdiClose}
      />
    </FlexRowWrap>
  );
};
