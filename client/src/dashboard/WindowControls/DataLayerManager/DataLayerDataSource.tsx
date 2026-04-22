import { FlexCol, FlexRow } from "@components/Flex";
import { Label } from "@components/Label";
import { Select } from "@components/Select/Select";
import { mdiPlus, mdiScript, mdiSetCenter, mdiTable } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { isDefined, isEqual } from "prostgles-types";
import React, { useMemo } from "react";
import { getChartCols } from "src/dashboard/W_Table/TableMenu/getChartCols";
import type { LinkSyncItem } from "../../Dashboard/dashboardUtils";
import { OSMLayerOptions } from "../OSMLayerOptions";
import { SQLChartLayerEditor } from "../SQLChartLayerEditor";
import type { ChartLinkOptions, DataLayerProps } from "./DataLayer";

export const DataLayerDataSource = (props: DataLayerProps) => {
  const { myLinks, layer, w, getLinksAndWindows } = props;

  const thisLink = myLinks.find((l) => l.id === layer.linkId);
  const linkOptions = thisLink?.options;
  if (
    !linkOptions ||
    (linkOptions.type !== "map" && linkOptions.type !== "timechart")
  ) {
    return null;
  }

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

  if (dataSource?.type === "osm") {
    return <OSMLayerOptions link={thisLink} dataSource={dataSource} />;
  }

  return (
    <Label
      variant="header"
      iconPath={
        dataSource?.type === "local-table" ? mdiTable
        : dataSource?.type === "table" ?
          mdiSetCenter
        : mdiScript
      }
      info={
        <DataLayerDataSourceInfo
          w={w}
          getLinksAndWindows={getLinksAndWindows}
          dataSource={dataSource}
          thisLink={thisLink}
        />
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
  );
};

const DataLayerDataSourceInfo = ({
  w,
  dataSource,
  thisLink,
  getLinksAndWindows,
}: {
  dataSource: Exclude<ChartLinkOptions["dataSource"], { type: "osm" }>;
  thisLink: LinkSyncItem;
} & Pick<DataLayerProps, "w" | "getLinksAndWindows">) => {
  const { tables, dbs } = usePrgl();
  const joinedChartCols = useMemo(() => {
    if (dataSource?.type !== "table") return;
    const otherW = getLinksAndWindows().windows.find(({ id }) =>
      [thisLink.w1_id, thisLink.w2_id].includes(id),
    );
    if (otherW?.type !== "table") return;
    const res = getChartCols({ type: "table", w: otherW, tables });
    const otherGeoCols = res.geoCols
      .map((c) =>
        c.type === "joined" && !isEqual(dataSource.joinPath, c.path) ?
          c
        : undefined,
      )
      .filter(isDefined);
    const otherDateCols = res.dateCols
      .map((c) =>
        c.type === "joined" && !isEqual(dataSource.joinPath, c.path) ?
          c
        : undefined,
      )
      .filter(isDefined);
    return { otherGeoCols, otherDateCols, otherW };
  }, [dataSource, getLinksAndWindows, tables, thisLink.w1_id, thisLink.w2_id]);

  if (dataSource?.type === "local-table") {
    return "Local table";
  }
  if (!dataSource || dataSource.type === "sql") {
    return <SQLChartLayerEditor link={thisLink} />;
  }

  const { joinPath, tableName } = dataSource;
  return (
    <FlexCol>
      <FlexRow>
        {[{ table: tableName }, ...(joinPath ?? [])].map(({ table }, i) => {
          const isLast = i === (joinPath?.length ?? 0);
          return <strong key={i}> {isLast ? table : `${table} -> `}</strong>;
        })}
      </FlexRow>
      <Select
        label={"Add another joined layer"}
        iconPath={mdiPlus}
        size="small"
        onChange={async (key) => {
          const col = joinedChartCols?.otherGeoCols.find((c) => c.key === key);
          if (!col) return;
          const thisLinkOpts = thisLink.options;
          if (thisLinkOpts.type !== "map") {
            return;
          }
          await dbs.links.insert({
            w1_id: thisLink.w1_id,
            w2_id: thisLink.w2_id,
            options: {
              type: "map",
              columns: [{ name: col.name, colorArr: [0, 0, 0] }],
              dataSource: {
                type: "table",
                tableName: joinedChartCols!.otherW.table_name,
                joinPath: col.path,
              },
              // tablePath: col.path,
              // columns: [{ name: col.name, colorArr: [0, 0, 0] }],
            },
            workspace_id: w.workspace_id,
            user_id: undefined as unknown as string,
            last_updated: undefined as unknown as string,
          });
        }}
        fullOptions={
          joinedChartCols?.otherGeoCols.map((geoCol) => ({
            key: geoCol.key,
            label: geoCol.label + ` (${geoCol.name})`,
          })) ?? []
        }
      />
    </FlexCol>
  );
};
