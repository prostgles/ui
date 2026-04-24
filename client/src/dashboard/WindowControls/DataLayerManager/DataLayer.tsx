import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { mdiClose, mdiEye, mdiEyeOff } from "@mdi/js";
import React, { useCallback } from "react";
import { RenderFilter } from "src/dashboard/RenderFilter";
import type { Link, LinkSyncItem } from "../../Dashboard/dashboardUtils";
import type { LayerQuery, W_MapProps } from "../../W_Map/W_Map";
import type {
  ProstglesTimeChartLayer,
  W_TimeChartProps,
} from "../../W_TimeChart/W_TimeChart";
import { LayerColorPicker } from "../LayerColorPicker";
import { TimeChartLayerOptions } from "../TimeChartLayerOptions";
import { DataLayerDataSource } from "./DataLayerDataSource";
import type { MapLayerManagerProps } from "./DataLayerManager";

export type ChartLinkOptions = Exclude<
  DBSSchema["links"]["options"],
  { type: "table" }
>;
export type DataLayerProps =
  | (Pick<W_TimeChartProps, "w" | "getLinksAndWindows" | "myLinks"> & {
      type: "timechart";
      asLegend?: boolean;
      layer: NonNullable<
        ProstglesTimeChartLayer & {
          link: LinkSyncItem;
        }
      >;
    })
  | (Pick<W_MapProps, "w" | "getLinksAndWindows" | "myLinks"> & {
      type: "map";
      asLegend?: boolean;
      w: MapLayerManagerProps["w"];
      layer: NonNullable<
        LayerQuery & {
          link: LinkSyncItem;
        }
      >;
    });
export const DataLayer = (props: DataLayerProps) => {
  const { myLinks, layer, w, getLinksAndWindows, asLegend } = props;

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
    <FlexRow
      key={layer._id}
      className={`LayerQuery bg-color-0 ta-left ai-center rounded ${asLegend ? "gap-p5" : "gap-0 b b-color pl-p5"}`}
    >
      <LayerColorPicker
        onChange={updateOptions}
        title={layerDesc}
        column={column}
        linkOptions={linkOptions}
        btnProps={
          asLegend ?
            {
              size: "micro",
            }
          : {}
        }
      />

      <DataLayerDataSource {...props} />

      {!asLegend && (
        <>
          <TimeChartLayerOptions
            w={w}
            getLinksAndWindows={getLinksAndWindows}
            link={thisLink}
            myLinks={myLinks}
            column={column}
          />

          {dataSource?.type === "local-table" && (
            <RenderFilter
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
        </>
      )}
    </FlexRow>
  );
};
