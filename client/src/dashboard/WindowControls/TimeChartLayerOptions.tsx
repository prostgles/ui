import Btn from "@components/Btn";
import { FlexCol, FlexRow, FlexRowWrap } from "@components/Flex";
import { Label } from "@components/Label";
import PopupMenu from "@components/PopupMenu";
import { Select } from "@components/Select/Select";
import { mdiSigma, mdiTableColumn } from "@mdi/js";
import { usePromise } from "prostgles-client";
import { _PG_numbers, includes, tryCatchV2 } from "prostgles-types";
import React from "react";
import { usePrgl } from "src/pages/ProjectConnection/PrglContextProvider";
import type { LinkSyncItem, WindowSyncItem } from "../Dashboard/dashboardUtils";
import { windowIs } from "../Dashboard/dashboardUtils";
import { RenderFilter } from "../RenderFilter";
import { getTableExpressionReturnType } from "../SQLEditor/SQLCompletion/completionUtils/getQueryReturnType";
import { getTimeChartLayer } from "../W_TimeChart/fetchData/getTimeChartLayers";
import { TIMECHART_STAT_TYPES } from "../W_TimeChart/W_TimeChartMenu";
import type { MapLayerManagerProps } from "./DataLayerManager/DataLayerManager";
import { SQLChartLayerEditor } from "./SQLChartLayerEditor";
import FormField from "@components/FormField/FormField";

type TimeChartLayerOptionsProps = Pick<
  MapLayerManagerProps,
  "myLinks" | "getLinksAndWindows"
> & {
  link: LinkSyncItem;
  column: string;
  w: WindowSyncItem;
  mode?: "on-screen";
};
export const TimeChartLayerOptions = ({
  link,
  column,
  getLinksAndWindows,
  myLinks,
  w: wMapOrTimechart,
  mode,
}: TimeChartLayerOptionsProps) => {
  const { db, tables } = usePrgl();
  const sqlHandler = db.sql;
  const linkOpts = link.options;
  const sqlDataSourceColumns = usePromise(async () => {
    if (
      !sqlHandler ||
      linkOpts.type !== "timechart" ||
      linkOpts.dataSource?.type !== "sql"
    )
      return [];
    const { colTypes, error } = await getTableExpressionReturnType(
      linkOpts.dataSource.sql,
      sqlHandler,
    );
    if (error) console.warn(error);
    return (
      colTypes?.map((c) => {
        return {
          ...c,
          name: c.column_name,
        };
      }) ?? []
    );
  }, [linkOpts, sqlHandler]);

  if (!windowIs(wMapOrTimechart, "timechart")) {
    return null;
  }
  const w = wMapOrTimechart as WindowSyncItem<"timechart">;
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
  const dataSource = linkOpts.dataSource;

  // TODO: this needs refactoring
  const cols =
    dataSource?.type === "sql" ? (sqlDataSourceColumns ?? [])
    : dataSource?.type === "local-table" ?
      (tables.find((t) => t.name === dataSource.localTableName)?.columns ?? [])
    : ((parentW?.type === "sql" ?
        (linkOpts.otherColumns ?? parentW.options.sqlResultCols)
      : parentW?.type === "table" ? table?.columns
      : []) ?? []);

  const numericCols = cols.filter((c) => includes(_PG_numbers, c.udt_name));
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
  const activeStatLabel = activeStat?.label ?? statType.funcName;
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

  const title = linkOpts.title || (
    <>
      {activeStatLabelDesc}
      {isOnScreen ? `${lq?.dateColumn}` : ""}
    </>
  );

  return (
    <>
      <PopupMenu
        title="Layer options"
        data-command="TimeChartLayerOptions.yAxis"
        showFullscreenToggle={{}}
        rootChildClassname="f-1"
        contentClassName="p-1"
        clickCatchStyle={{ opacity: 1 }}
        button={
          <FlexRow className="gap-p5 font-14">
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
              {title}
            </Btn>
          </FlexRow>
        }
        render={() => (
          <FlexCol className="gap-2 f-1 ">
            <FormField
              type="text"
              label={"Title (optional)"}
              value={linkOpts.title}
              onChange={(newTitle) => {
                updateLinkOpts({ title: newTitle });
              }}
            />
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
                        statType.numericColumn ?? numericCols[0]!.name,
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
              <FlexCol
                className={"gap-p5 " + (lq?.type === "sql" ? "f-1" : "")}
              >
                <Label variant="normal">
                  {lq?.type === "sql" ? "Query" : "Table"}
                </Label>
                {lq?.type === "sql" ?
                  <SQLChartLayerEditor link={link} />
                : <code className="ta-start ws-pre-line bg-color-2 rounded p-p5">
                    {lq?.type === "table" ?
                      (lq.joinPath?.at(-1)?.table ?? lq.tableName)
                    : lq?.localTableName}
                  </code>
                }
              </FlexCol>
            )}
            {lq?.type === "local-table" &&
              dataSource?.type === "local-table" && (
                <FlexCol className="gap-p5">
                  <Label variant="normal">Filter</Label>
                  <RenderFilter
                    title="Manage filters"
                    mode="compact"
                    selectedColumns={undefined}
                    itemName="filter"
                    contextData={undefined}
                    onChange={(smartGroupFilter) => {
                      updateLinkOpts({
                        dataSource: {
                          ...dataSource,
                          smartGroupFilter,
                        },
                      });
                    }}
                    db={db}
                    tableName={lq.localTableName}
                    filter={dataSource.smartGroupFilter}
                    tables={tables}
                  />
                </FlexCol>
              )}
          </FlexCol>
        )}
      />
    </>
  );
};
