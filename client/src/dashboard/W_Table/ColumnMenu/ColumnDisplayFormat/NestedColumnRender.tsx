import React from "react"; 
import { TimeChart } from "../../../Charts/TimeChart";
import MediaViewer from "../../../../components/MediaViewer";
import { FlexRowWrap } from "../../../../components/Flex";
import { AnyObject } from "prostgles-types";
import { ColumnConfig } from "../ColumnMenu";
import { omitKeys } from "../../../../utils";
import { DBSchemaTablesWJoins } from "../../../Dashboard/dashboardUtils";
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
}
export const NestedColumnRender = ({ value, c, row, nestedTimeChartMeta, tables }: P): JSX.Element => {

  const table = tables.find(t => t.name === c.nested?.path.at(-1)?.table);
  const isMedia = table?.info.isFileTable;
  const nestedColumns = c.nested? getColWInfo(tables, { table_name: c.nested!.path.at(-1)!.table, columns: c.nested.columns }) : undefined;
  if(!nestedColumns){
    return <>Unexpected issue</>
  }
  if (value?.length && c.nested?.chart && nestedTimeChartMeta) {
    return <TimeChart
      binSize={undefined}
      showXAxis={false}
      yAxisVariant="compact"
      className="bg-transparent"
      padding={{
        top: 10,
        bottom: 10,
      }}
      zoomPanDisabled={true}
      renderStyle={c.nested.chart.renderStyle === "smooth-line"? undefined : c.nested.chart.renderStyle}
      layers={[
        {
          label: `${Object.entries(omitKeys(row, [c.name])).map(([key, val]) => `${key}: ${JSON.stringify(val)}`)}`,
          getYLabel: getYLabelFunc(""),
          color: "rgb(0, 183, 255)",
          cols: [],
          data: value as any,
          variant: c.nested.chart.renderStyle === "smooth-line"? "smooth" : undefined,
          ...nestedTimeChartMeta,
        }
      ]}
    />
  }
  const content = (value ?? []).slice(0, NESTED_LIMIT).map((nestedObj, idx) => {
    if (!nestedObj) return null;

    if (isMedia) {
      return <MediaViewer
        style={{ height: "100%" }}
        key={nestedObj.url}
        url={nestedObj.url}
        allowedContentTypes={
          [MediaViewer.getMimeFromURL(nestedObj.url)!]
        }
      />
    }
    return <div key={idx} className="flex-row-wrap gap-p5 ws-pre mb-p5">
      {Object.entries(nestedObj).map(([key, value]) => {
        const columnWInfo = nestedColumns.find(c => c.name === key);
        const renderedValue = columnWInfo ? SmartFormField.renderValue(columnWInfo.info, value, true) : JSON.stringify(value);
        const displayModeClass = {
          column: "flex-col",
          row: "flex-row gap-p25",
          "no-headers": "flex-row-wrap gap-p25"
        }
        const { displayMode = "column" } = c.nested!;
        return <div key={key} className={`${displayModeClass[displayMode]} gap-0`}>
          {displayMode !== "no-headers" && <div className="text-gray-400 font-12">{key}</div>}
          <div>{renderedValue}</div>
        </div>
      })}
    </div>;
  });

  if (isMedia) {
    return <FlexRowWrap className="max-h-full">
      {content}
    </FlexRowWrap>
  }

  return <>{content}</>;
}