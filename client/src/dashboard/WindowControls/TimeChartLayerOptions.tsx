import { mdiSigma, mdiTableColumn } from "@mdi/js";
import { _PG_numbers } from "prostgles-types";
import React from "react";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow, FlexRowWrap } from "../../components/Flex";
import { Label } from "../../components/Label";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";
import type { LinkSyncItem, WindowSyncItem } from "../Dashboard/dashboardUtils";
import { windowIs } from "../Dashboard/dashboardUtils";
import { getTimeChartLayer } from "../W_TimeChart/getTimeChartLayers";
import { TIMECHART_STAT_TYPES } from "../W_TimeChart/W_TimeChartMenu";
import type { MapLayerManagerProps } from "./ChartLayerManager";

type TimeChartLayerOptionsProps = Pick<
  MapLayerManagerProps,
  "tables" | "myLinks" | "getLinksAndWindows"
> & {
  link: LinkSyncItem;
  column: string;
  w: WindowSyncItem;
  mode?: "on-screen";
};
export const TimeChartLayerOptions = ({
  link,
  column,
  tables,
  getLinksAndWindows,
  myLinks,
  w: wMapOrTimechart,
  mode,
}: TimeChartLayerOptionsProps) => {
  if (!windowIs(wMapOrTimechart, "timechart")) {
    return null;
  }
  const w = wMapOrTimechart as WindowSyncItem<"timechart">;
  const linkOpts = link.options;
  if (linkOpts.type !== "timechart") {
    return <>Invalid link type: {linkOpts.type}</>;
  }

  const colOpts = linkOpts.columns.find((dc) => dc.name === column);
  if (!colOpts) {
    return <>Column not found: {column}</>;
  }

  const { windows, links } = getLinksAndWindows();
  const { data: lq } = tryCatchV2(() =>
    getTimeChartLayer({
      active_row: undefined,
      link,
      windows,
      links,
      myLinks,
      w,
    }).find((l) => l.dateColumn === column),
  );
  const parentW = windows.find(
    (_w) => _w.id !== w.id && [link.w1_id, link.w2_id].includes(_w.id),
  );
  const table =
    lq?.type === "table" ?
      tables.find((t) => t.name === lq.tableName)
    : undefined;
  const cols =
    (parentW?.type === "sql" ?
      (linkOpts.otherColumns ?? parentW.options.sqlResultCols)
    : parentW?.type === "table" ? table?.columns
    : []) ?? [];
  const numericCols = cols.filter((c) =>
    _PG_numbers.includes(c.udt_name as any),
  );
  const statType = colOpts.statType ?? {
    funcName: "$countAll",
    numericColumn: undefined,
  };

  const updateLinkOpts = (newOpts: Partial<typeof linkOpts>) => {
    link.$update(
      {
        options: newOpts,
      },
      { deepMerge: true },
    );
  };

  const updateCol = (col: string, newColOpts: Partial<typeof colOpts>) => {
    updateLinkOpts({
      ...linkOpts,
      columns: linkOpts.columns.map((c) =>
        c.name === col ? { ...c, ...newColOpts } : c,
      ),
    });
  };
  const isOnScreen = mode === "on-screen";
  const activeStat = TIMECHART_STAT_TYPES.find(
    (s) => s.func === statType.funcName,
  );
  const activeStatLabel: (typeof TIMECHART_STAT_TYPES)[number]["label"] =
    activeStat?.label ?? (statType.funcName as any);
  const boldTextNode = (text: string) => (
    <strong style={{ margin: ".6px" }}>{text}</strong>
  );
  const fadedTextNode = (text: string) => (
    <span style={{ opacity: 0.7 }}>{text}</span>
  );
  const activeStatLabelDesc =
    activeStatLabel === "Count All" ? "count(*), " : (
      <FlexRow className="gap-0">
        {fadedTextNode(`${activeStatLabel}(`)}
        {boldTextNode(colOpts.statType?.numericColumn ?? "")}
        {fadedTextNode(`),`)}
      </FlexRow>
    );
  const groupByCols = cols.filter(
    (c) =>
      c.name !== lq?.statType?.numericColumn &&
      c.name !== lq?.dateColumn &&
      c.udt_name !== "timestamp" &&
      c.udt_name !== "timestamptz",
  );

  return (
    <>
      <PopupMenu
        title="Y-axis options"
        data-command="TimeChartLayerOptions.yAxis"
        button={
          <FlexRow style={{ gap: ".5em", fontSize: "14px" }}>
            <Btn
              color="action"
              variant={isOnScreen ? "text" : "faded"}
              iconPath={isOnScreen ? "" : mdiSigma}
              title="Aggregate function"
              data-command="TimeChartLayerOptions.aggFunc"
              style={{
                paddingRight: isOnScreen ? "0" : undefined,
              }}
            >
              {activeStatLabelDesc}
              {isOnScreen ? `${lq?.dateColumn}` : ""}
            </Btn>
          </FlexRow>
        }
        render={() => (
          <FlexCol className="gap-2">
            <FlexRowWrap>
              <Select
                label="Aggregation type"
                variant="div"
                className="w-fit"
                data-command="TimeChartLayerOptions.aggFunc.select"
                btnProps={{
                  iconPath: mdiSigma,
                  color: "action",
                  iconPosition: "left",
                }}
                fullOptions={TIMECHART_STAT_TYPES.map((s) => ({
                  key: s.func,
                  label: s.label,
                  disabledInfo:
                    numericCols.length || s.func === "$countAll" ?
                      undefined
                    : "Requires a numeric column",
                }))}
                value={statType.funcName}
                onChange={(funcName) => {
                  updateCol(colOpts.name, {
                    statType: {
                      funcName,
                      numericColumn:
                        statType.numericColumn ?? numericCols[0]!.name!,
                    },
                  });
                }}
              />
              <Select
                label="Aggregation field"
                variant="div"
                className="w-fit "
                btnProps={{
                  color: "action",
                }}
                data-command="TimeChartLayerOptions.numericColumn"
                fullOptions={numericCols.map((c) => ({
                  key: c.name,
                  subLabel: c.udt_name,
                  ...c,
                }))}
                disabledInfo={
                  statType.funcName === "$countAll" ?
                    "Requires a different aggregation function"
                  : !numericCols.length ?
                    "No numeric columns available"
                  : undefined
                }
                value={colOpts.statType?.numericColumn}
                onChange={(numericColumn) => {
                  updateCol(colOpts.name, {
                    statType: { ...statType, numericColumn },
                  });
                }}
              />
            </FlexRowWrap>
            <Select
              label="Group by field"
              variant="div"
              className="w-fit "
              data-command="TimeChartLayerOptions.groupBy"
              optional={true}
              disabledInfo={
                groupByCols.length ? undefined : (
                  "No groupable columns available"
                )
              }
              btnProps={{
                iconPath: mdiTableColumn,
                color: !lq?.groupByColumn ? undefined : "action",
                iconPosition: "left",
              }}
              fullOptions={[
                {
                  key: undefined,
                  label: "NONE",
                },
                ...groupByCols.map((s) => ({
                  key: s.name,
                  label: "label" in s ? s.label : s.name,
                  subLabel: s.udt_name,
                })),
              ]}
              value={lq?.groupByColumn}
              onChange={(groupByColumn) => {
                updateLinkOpts({ groupByColumn });
              }}
            />
            {isOnScreen && (
              <FlexCol className="gap-p5">
                <Label variant="normal">
                  {lq?.type === "sql" ? "Query" : "Table"}
                </Label>
                <code className="ta-start ws-pre-line bg-color-2 rounded p-p5">
                  {lq?.type === "sql" ? lq.sql : lq?.tableName}
                </code>
              </FlexCol>
            )}
          </FlexCol>
        )}
      />
    </>
  );
};

type TryCatchResult<T> =
  | { data: T; hasError?: false; error?: undefined; duration: number }
  | { data?: undefined; hasError: true; error: unknown; duration: number };

export const tryCatchV2 = <T,>(
  func: () => T | Promise<T>,
): T extends Promise<T> ? Promise<TryCatchResult<Awaited<T>>>
: TryCatchResult<T> => {
  const startTime = Date.now();
  try {
    const dataOrResult = func();
    if (dataOrResult instanceof Promise) {
      return new Promise(async (resolve, reject) => {
        const duration = Date.now() - startTime;
        const data = await dataOrResult;
        resolve({
          data,
          duration,
        });
      }) as any;
    }
    return {
      data: dataOrResult,
      duration: Date.now() - startTime,
    } as any;
  } catch (error) {
    console.error(error);
    return {
      error,
      hasError: true,
      duration: Date.now() - startTime,
    } as any;
  }
};
