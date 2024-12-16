import { mdiChartTimelineVariant } from "@mdi/js";
import React from "react";
import Btn from "../../../components/Btn";
import { FlexCol } from "../../../components/Flex";
import PopupMenu from "../../../components/PopupMenu";
import Select from "../../../components/Select/Select";
import { SwitchToggle } from "../../../components/SwitchToggle";
import type { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";
import {
  TIMECHART_STAT_TYPES,
  TimechartRenderStyles,
} from "../../W_TimeChart/W_TimeChartMenu";
import type { ColumnConfigWInfo } from "../W_Table";
import { _PG_numbers } from "prostgles-types";

export const SORTABLE_CHART_COLUMNS = ["date", "value"];

export type ColTimeChart = Required<ColumnConfigWInfo>["nested"]["chart"];
type P = {
  tableName: string | undefined;
  tables: DBSchemaTablesWJoins;
  chart: ColTimeChart | undefined;
  onChange: (newCol: ColTimeChart | undefined) => void;
};
export const NestedTimechartControls = ({
  tableName,
  chart,
  tables,
  onChange,
}: P) => {
  if (!tableName) return null;

  const table = tables.find((t) => t.name === tableName);
  if (!table) return null;

  const dateCols = table.columns.filter(
    (c) => c.udt_name.startsWith("timestamp") || c.udt_name === "date",
  );
  const numericCols = table.columns.filter((c) =>
    _PG_numbers.includes(c.udt_name as any),
  );
  const timeChartOpts =
    !dateCols.length ? undefined : (
      {
        dateCols,
        numericCols,
      }
    );

  if (!timeChartOpts) return null;

  return (
    <>
      <div className="py-p75">OR</div>
      <PopupMenu
        button={
          <Btn
            color={chart ? "action" : undefined}
            variant="faded"
            iconPath={mdiChartTimelineVariant}
          >
            Time chart {chart ? ": Enabled" : ""}
          </Btn>
        }
        clickCatchStyle={{ opacity: 0 }}
        contentClassName="p-p5"
        positioning="beneath-left"
        render={(pClose) => (
          <FlexCol>
            <SwitchToggle
              label={"Enable"}
              checked={!!chart}
              onChange={(checked) => {
                const dateCol = timeChartOpts.dateCols[0]!.name;
                onChange(
                  !checked ? undefined : (
                    {
                      type: "time",
                      dateCol,
                      renderStyle: "smooth-line",
                      yAxis: {
                        isCountAll: true,
                      },
                    }
                  ),
                );
              }}
            />
            {chart && numericCols.length > 0 && (
              <>
                <Select
                  label={"Aggregation type"}
                  fullOptions={TIMECHART_STAT_TYPES.map(
                    ({ func: key, label }) => ({ key, label }),
                  )}
                  value={
                    chart.yAxis.isCountAll === true ?
                      "$countAll"
                    : chart.yAxis.funcName
                  }
                  onChange={(funcName) => {
                    onChange({
                      ...chart,
                      yAxis:
                        funcName === "$countAll" ?
                          { isCountAll: true }
                        : {
                            colName: numericCols[0]!.name,
                            ...chart.yAxis,
                            funcName,
                            isCountAll: false,
                          },
                    });
                  }}
                />
                {chart.yAxis.isCountAll !== true && (
                  <Select
                    label={"Aggregated column"}
                    fullOptions={numericCols.map((c) => ({
                      key: c.name,
                      subLabel: c.udt_name,
                    }))}
                    value={chart.yAxis.colName}
                    onChange={(colName) => {
                      onChange({
                        ...chart,
                        yAxis: {
                          ...(chart.yAxis as any),
                          isCountAll: false,
                          colName,
                        },
                      });
                    }}
                  />
                )}

                <Select
                  label="Chart style"
                  value={chart.renderStyle}
                  fullOptions={TimechartRenderStyles.concat([
                    { key: "smooth-line", label: "Smooth line" } as any,
                  ])}
                  onChange={(renderStyle) => {
                    onChange({
                      ...chart,
                      renderStyle,
                    });
                  }}
                />
              </>
            )}
          </FlexCol>
        )}
      />
    </>
  );
};
