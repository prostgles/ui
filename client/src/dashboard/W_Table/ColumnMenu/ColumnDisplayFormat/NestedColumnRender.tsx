import React from "react";
import { TimeChart } from "../../../Charts/TimeChart";
import { MediaViewer } from "../../../../components/MediaViewer";
import { FlexRowWrap } from "../../../../components/Flex";
import type { AnyObject } from "prostgles-types";
import type { ColumnConfig } from "../ColumnMenu";
import { omitKeys } from "prostgles-types";
import type { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
import { getColWInfo } from "../../tableUtils/getColWInfo";
import SmartFormField from "../../../SmartForm/SmartFormField/SmartFormField";
import { getYLabelFunc } from "../../../W_TimeChart/getTimeChartData";

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
    c.nested ?
      getColWInfo(tables, {
        table_name: c.nested!.path.at(-1)!.table,
        columns: c.nested.columns,
      })
    : undefined;
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
        layers={[
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
        ]}
      />
    );
  }
  const shownNestedColumns = nestedColumns.filter((c) => c.show);
  const renderValue = ({ key, value }: { key: string; value: any }) => {
    const columnWInfo = nestedColumns.find((c) => c.name === key);
    const datType =
      columnWInfo?.info ?? columnWInfo?.computedConfig?.funcDef.outType;
    const renderedValue =
      columnWInfo ?
        SmartFormField.renderValue(datType, value, true)
      : JSON.stringify(value);
    return renderedValue;
  };
  const valueList = value ?? [];
  const [firstValue, ...rest] = valueList;
  const isSingleValue = shownNestedColumns.length === 1;
  if (isSingleValue && !isMedia && firstValue && !rest.length) {
    const [key, value] = Object.entries(firstValue)[0]!;
    return <>{renderValue({ key, value })}</>;
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
              <div>{renderValue({ key, value })}</div>
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
