import type { AnyObject } from "prostgles-types";
import { omitKeys } from "prostgles-types";
import React, { useMemo } from "react";
import { FlexRowWrap } from "@components/Flex";
import { MediaViewer } from "@components/MediaViewer";
import {
  TimeChart,
  type TimeChartLayer,
} from "../../../Charts/TimeChart/TimeChart";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
import { RenderValue } from "../../../SmartForm/SmartFormField/RenderValue";
import { getYLabelFunc } from "../../../W_TimeChart/fetchData/getTimeChartData";
import { getColWInfo } from "../../tableUtils/getColWInfo";
import type { ColumnConfig } from "../ColumnMenu";

const NESTED_LIMIT = 10;

export type NestedTimeChartMeta = {
  fullExtent: [Date, Date];
  // binSize: number;
};
type P = {
  c: ColumnConfig;
  value: (AnyObject | undefined)[] | null;
  row: AnyObject;
  nestedTimeChartMeta: NestedTimeChartMeta | undefined;
  tables: DBSchemaTablesWJoins;
};
export const NestedColumnRender = ({
  value,
  c,
  row,
  nestedTimeChartMeta,
  tables,
}: P): JSX.Element => {
  const table = tables.find((t) => t.name === c.nested?.path.at(-1)?.table);
  const isMedia = table?.info.isFileTable;
  const nestedColumns =
    c.nested && table ? getColWInfo(table, c.nested.columns) : undefined;
  const layers: Omit<TimeChartLayer, "yScale">[] = useMemo(
    () =>
      !c.nested?.chart || !nestedTimeChartMeta ?
        []
      : [
          {
            label: `${Object.entries(omitKeys(row, [c.name])).map(([key, val]) => `${key}: ${JSON.stringify(val)}`)}`,
            getYLabel: getYLabelFunc(""),
            color: "rgb(0, 183, 255)",
            cols: [],
            data: value as any,
            variant:
              c.nested.chart.renderStyle === "smooth-line" ?
                "smooth"
              : undefined,
            ...nestedTimeChartMeta,
          },
        ],
    [c.name, c.nested?.chart, nestedTimeChartMeta, row, value],
  );
  if (!nestedColumns) {
    return <>Unexpected issue: No nested columns</>;
  }
  if (value?.length && c.nested?.chart && nestedTimeChartMeta) {
    return (
      <TimeChart
        binSize={undefined}
        showXAxis={false}
        yAxisVariant="compact"
        className="bg-transparent"
        padding={{
          top: 10,
          bottom: 10,
        }}
        zoomPanDisabled={true}
        renderStyle={
          c.nested.chart.renderStyle === "smooth-line" ?
            undefined
          : c.nested.chart.renderStyle
        }
        layers={layers}
      />
    );
  }
  const shownNestedColumns = nestedColumns.filter((c) => c.show);
  const render = ({ key, value }: { key: string; value: any }) => {
    const columnWInfo = nestedColumns.find((c) => c.name === key);
    const datType = columnWInfo?.info ?? columnWInfo?.computedConfig;
    const renderedValue =
      columnWInfo ?
        <RenderValue
          column={datType}
          value={value}
          getValues={() => valueList.map((v) => v?.[key])}
        />
      : JSON.stringify(value);
    return renderedValue;
  };
  const valueList = value ?? [];
  const [firstValue, ...rest] = valueList;
  const isSingleValue = shownNestedColumns.length === 1;
  if (isSingleValue && !isMedia && firstValue && !rest.length) {
    const [key, value] = Object.entries(firstValue)[0]!;
    return <>{render({ key, value })}</>;
  }
  const content = valueList.slice(0, NESTED_LIMIT).map((nestedObj, idx) => {
    if (!nestedObj) return null;

    if (isMedia) {
      return (
        <MediaViewer
          style={{ height: "100%" }}
          key={nestedObj.url}
          url={nestedObj.url}
        />
      );
    }

    const objectEntries = Object.entries(nestedObj);

    return (
      <div key={idx} className="flex-row-wrap gap-p5 ws-pre mb-p5">
        {objectEntries.map(([key, value]) => {
          const displayModeClass = {
            column: "flex-col",
            row: "flex-row gap-p25",
            "no-headers": "flex-row-wrap gap-p25",
          };
          const { displayMode = "column" } = c.nested!;
          return (
            <div key={key} className={`${displayModeClass[displayMode]} gap-0`}>
              {displayMode !== "no-headers" && (
                <div className="text-2 font-12">{key}</div>
              )}
              <div>{render({ key, value })}</div>
            </div>
          );
        })}
      </div>
    );
  });

  if (isMedia) {
    return <FlexRowWrap className="max-h-full">{content}</FlexRowWrap>;
  }

  return <>{content}</>;
};
