import ErrorComponent from "@components/ErrorComponent";
import Loading from "@components/Loader/Loading";
import { CellBarchart } from "@components/ProgressBar";
import { Table } from "@components/Table/Table";
import type { AnyObject } from "prostgles-types";
import React from "react";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { kFormatter, type ActiveRow } from "../W_Table/W_Table";
import Window from "../Window";
import { useBarchartData } from "./useBarchartData";

export type W_BarchartProps = Omit<CommonWindowProps, "w"> & {
  onClickRow: (
    row: AnyObject | undefined,
    tableName: string,
    values: ActiveRow["barChart"] | undefined,
  ) => void;
  myActiveRow: ActiveRow | undefined;
  activeRowColor: string | undefined;
  w: WindowSyncItem<"barchart">;
};

export const W_Barchart = ({
  w,
  prgl,
  myLinks,
  workspace,
  getLinksAndWindows,
}: W_BarchartProps) => {
  const { barChartData, setSort, sort } = useBarchartData({
    myLinks,
    prgl,
    getLinksAndWindows,
  });
  return (
    <Window
      getMenu={undefined}
      w={w}
      layoutMode={workspace.layout_mode ?? "editable"}
    >
      {!barChartData ?
        <Loading />
      : barChartData.type === "error" ?
        <ErrorComponent error={barChartData.message} />
      : <Table
          rows={barChartData.rows}
          sort={
            sort && [
              {
                key: sort.column,
                asc: sort.direction === "asc",
              },
            ]
          }
          onSort={([newSort]) => {
            setSort(
              newSort && {
                column: newSort.key,
                direction: newSort.asc ? "asc" : "desc",
              },
            );
          }}
          cols={[
            {
              key: "label",
              name: "label",
              label: barChartData.labelColumn,
              width: barChartData.labelMaxWidth,
              sortable: true,
              filter: false,
              tsDataType: "string",
              udt_name: "text",
            },
            {
              key: "value",
              name: "value",
              label:
                barChartData.statType?.funcName.slice(1).toUpperCase() ||
                "Count",
              sortable: true,
              filter: false,
              tsDataType: "number",
              udt_name: "int4",
              onRender: ({ value }) => (
                <CellBarchart
                  style={{ marginTop: "6px" }}
                  min={barChartData.min}
                  max={barChartData.max}
                  barColor={`rgb(${barChartData.colorArr.slice(0, 3).join(",")})`}
                  textColor={"var(--text-0)"}
                  value={Number(value)}
                  message={kFormatter(Number(value))}
                />
              ),
            },
          ]}
        />
      }
    </Window>
  );
};
