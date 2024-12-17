import { mdiPlus } from "@mdi/js";
import { isDefined } from "prostgles-types";
import React, { useMemo } from "react";
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
        onChange={(key) => {
          const chartTableFromKey = chartTables.find((gt) => gt.key === key);
          if (chartTableFromKey) {
            const colorArr = [100, 20, 57];

            dbs.links.insert({
              w1_id: w.id,
              w2_id: w.id,
              workspace_id: w.workspace_id,
              options: {
                type,
                colorArr,
                columns: [
                  {
                    name: chartTableFromKey.column,
                    colorArr,
                  },
                ],
                localTableName: chartTableFromKey.tableName,
              },
              last_updated: undefined as any,
              user_id: undefined as any,
            });
          }
        }}
      />
      {type === "map" && (
        <PopupMenu
          title="Add OSM Layer"
          contentClassName="p-1"
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
