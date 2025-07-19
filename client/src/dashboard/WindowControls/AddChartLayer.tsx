import { mdiPlus } from "@mdi/js";
import { isDefined } from "prostgles-types";
import React, { useMemo, useState } from "react";
import Select from "../../components/Select/Select";
import type { MapLayerManagerProps } from "./ChartLayerManager";
import { FlexRow } from "../../components/Flex";
import PopupMenu from "../../components/PopupMenu";
import Btn from "../../components/Btn";
import { MapOSMQuery } from "../W_Map/MapOSMQuery";
import type { Extent } from "../Map/DeckGLMap";

export const defaultWorldExtent: Extent = [-180, -90, 180, 90];

export const AddChartLayer = (props: MapLayerManagerProps) => {
  const {
    tables,
    type,
    prgl: { dbs },
    w,
  } = props;
  const isMap = type === "map";
  let osmBbox = ""; // w.type === "map"? w.options.extent?.join(",") : "";
  if (w.type === "map") {
    const [b, a, b1, a1] = w.options.extent ?? defaultWorldExtent;
    osmBbox = [a, b, a1, b1].join(",");
  }
  const [_, setError] = useState();
  const chartTables = useMemo(() => {
    return tables
      .flatMap((t) => {
        const chartCols = t.columns.filter((c) =>
          c.udt_name.startsWith(isMap ? "geo" : "timestamp"),
        );
        if (chartCols.length) {
          return chartCols.map((c) => ({
            key: `${t.name}.${c.name}`,
            tableName: t.name,
            column: c.name,
          }));
        }
        return undefined;
      })
      .filter(isDefined)
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [tables, isMap]);

  return (
    <FlexRow className="AddChartLayer">
      <Select
        data-command="ChartLayerManager.AddChartLayer.addLayer"
        btnProps={{
          iconPath: mdiPlus,
          color: "action",
          variant: "filled",
          children: "Add layer",
        }}
        fullOptions={chartTables.map((t) => ({
          key: t.key,
          label: t.tableName,
          subLabel: t.column,
        }))}
        onChange={async (key) => {
          const chartTableFromKey = chartTables.find((gt) => gt.key === key);
          if (chartTableFromKey) {
            const colorArr = [100, 20, 57];

            await dbs.links
              .insert({
                w1_id: w.id,
                w2_id: w.id,
                workspace_id: w.workspace_id,
                options: {
                  type,
                  dataSource: {
                    type: "local-table",
                    localTableName: chartTableFromKey.tableName,
                  },
                  columns: [
                    {
                      name: chartTableFromKey.column,
                      colorArr,
                    },
                  ],
                },
                last_updated: undefined as any,
                user_id: undefined as any,
              })
              .catch((e) => {
                console.error(e);
                setError(() => {
                  throw new Error(e);
                });
              });
          }
        }}
      />
      {type === "map" && (
        <PopupMenu
          title="Add OSM Layer"
          contentClassName="p-1"
          data-command="ChartLayerManager.AddChartLayer.addOSMLayer"
          button={
            <Btn iconPath={mdiPlus} variant="faded" color="action">
              Add OSM Layer
            </Btn>
          }
          onClickClose={false}
        >
          {osmBbox && (
            <MapOSMQuery
              {...props}
              bbox={osmBbox}
              onData={(_, osmLayerQuery) => {
                dbs.links.insert({
                  w1_id: w.id,
                  w2_id: w.id,
                  workspace_id: w.workspace_id,
                  options: {
                    type,
                    columns: [],
                    osmLayerQuery,
                  },
                  last_updated: undefined as any,
                  user_id: undefined as any,
                });
              }}
            />
          )}
        </PopupMenu>
      )}
    </FlexRow>
  );
};

type Linkz = {
  is_view: false;
  select: true;
  insert: true;
  update: true;
  delete: true;
  columns: {
    closed?: null | boolean;
    created?: null | string;
    deleted?: null | boolean;
    disabled?: null | boolean;
    id?: string;
    last_updated: string;
    options:
      | {
          type: "table";
          colorArr?: number[];
          tablePath: { table: string; on: Record<string, any>[] }[];
        }
      | {
          type: "map";
          dataSource?:
            | { type: "sql"; sql: string; withStatement: string }
            | {
                type: "table";
                joinPath?: { table: string; on: Record<string, any>[] }[];
              }
            | {
                type: "local-table";
                localTableName: string;
                smartGroupFilter?: { $and: any[] } | { $or: any[] };
              };
          smartGroupFilter?: { $and: any[] } | { $or: any[] };
          joinPath?: { table: string; on: Record<string, any>[] }[];
          localTableName?: string;
          sql?: string;
          osmLayerQuery?: string;
          mapIcons?:
            | { type: "fixed"; iconPath: string }
            | {
                type: "conditional";
                columnName: string;
                conditions: { value: any; iconPath: string }[];
              };
          mapColorMode?:
            | { type: "fixed"; colorArr: number[] }
            | {
                type: "scale";
                columnName: string;
                min: number;
                max: number;
                minColorArr: number[];
                maxColorArr: number[];
              }
            | {
                type: "conditional";
                columnName: string;
                conditions: { value: any; colorArr: number[] }[];
              };
          mapShowText?: { columnName: string };
          columns: { name: string; colorArr: number[] }[];
        }
      | {
          type: "timechart";
          dataSource?:
            | { type: "sql"; sql: string; withStatement: string }
            | {
                type: "table";
                joinPath?: { table: string; on: Record<string, any>[] }[];
              }
            | {
                type: "local-table";
                localTableName: string;
                smartGroupFilter?: { $and: any[] } | { $or: any[] };
              };
          smartGroupFilter?: { $and: any[] } | { $or: any[] };
          joinPath?: { table: string; on: Record<string, any>[] }[];
          localTableName?: string;
          sql?: string;
          groupByColumn?: string;
          otherColumns?: { name: string; label?: string; udt_name: string }[];
          columns: {
            name: string;
            colorArr: number[];
            statType?: {
              funcName: "$min" | "$max" | "$countAll" | "$avg" | "$sum";
              numericColumn: string;
            };
          }[];
        };
    user_id: string;
    w1_id: string;
    w2_id: string;
    workspace_id?: null | string;
  };
};
