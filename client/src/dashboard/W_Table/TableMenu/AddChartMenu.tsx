import { mdiChartLine, mdiMap } from "@mdi/js";
import { useMemoDeep, usePromise } from "prostgles-client/dist/prostgles";
import {
  _PG_numbers,
  isDefined,
  type ParsedJoinPath,
  type SQLHandler,
} from "prostgles-types";
import React from "react";
import Btn, { type BtnProps } from "../../../components/Btn";
import Select from "../../../components/Select/Select";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type {
  DBSchemaTablesWJoins,
  OnAddChart,
  WindowData,
} from "../../Dashboard/dashboardUtils";
import { getRandomColor } from "../../Dashboard/dashboardUtils";
import { rgbaToString } from "../../W_Map/getMapFeatureStyle";
import { getRankingFunc } from "../ColumnMenu/JoinPathSelectorV2";
import type { ChartColumn, ColInfo } from "./getChartCols";
import { getChartCols } from "./getChartCols";
import type { ChartableSQL } from "../../W_SQL/getChartableSQL";
import { t } from "../../../i18n/i18nUtils";

type P = Pick<CommonWindowProps, "myLinks" | "childWindows"> & {
  onAddChart: OnAddChart;
  tables: DBSchemaTablesWJoins;
  btnClassName?: string;
  size?: "micro";
} & (
    | {
        type: "sql";
        w: WindowData<"sql">;
        chartableSQL: ChartableSQL;
      }
    | {
        type: "table";
        w: WindowData<"table">;
        chartableSQL: undefined;
      }
  );

export const AddChartMenu = (props: P) => {
  const {
    type,
    w,
    onAddChart,
    tables,
    chartableSQL,
    size,
    myLinks,
    childWindows,
  } = props;

  const isMicroMode = size === "micro";
  const chartCols = useMemoDeep(() => {
    const res = getChartCols(
      type === "table" ?
        { type: "table", w, tables }
      : { type: "sql", chartableSQL, w },
    );
    return res;
  }, [chartableSQL, tables, w]);

  const { geoCols, dateCols, sql, withStatement = "" } = chartCols;

  const tableName = w.table_name;
  const onAdd = (
    linkOpts: { type: "map" | "timechart"; columns: ChartColumn[] },
    joinPath: ParsedJoinPath[] | undefined,
  ) => {
    const otherColumns = linkOpts.columns
      .reduce((a, v) => {
        v.otherColumns.forEach((vc) => {
          if (!a.some((ac) => ac.name === vc.name)) {
            a.push(vc);
          }
        });
        return a;
      }, [] as ColInfo[])
      .map(({ name, udt_name }) => ({ name, udt_name }));

    const firstNumericColumn = otherColumns.find((c) =>
      _PG_numbers.includes(c.udt_name as any),
    )?.name;
    const columnList = `(${linkOpts.columns.map((c) => c.name).join()})`;
    const name =
      joinPath ?
        `${[tableName, ...joinPath.slice(0).map((p) => p.table)].join(" > ")} ${columnList}`
      : `${tableName || ""} ${columnList}`;
    const usedColors = myLinks.flatMap((l) =>
      l.options.type !== "table" ?
        l.options.columns.map((c) => c.colorArr)
      : undefined,
    );
    const colorArr = getRandomColor(1, "deck", usedColors);
    const type = linkOpts.type;
    onAddChart({
      name,
      linkOpts: {
        ...(type === "timechart" ?
          {
            type,
            otherColumns,
            columns: [
              {
                name: linkOpts.columns[0]!.name,
                colorArr,
                statType:
                  firstNumericColumn ?
                    {
                      funcName: "$avg",
                      numericColumn: firstNumericColumn,
                    }
                  : undefined,
              },
            ],
          }
        : {
            type,
            columns: linkOpts.columns.map(({ name }, i) => ({
              name,
              colorArr,
            })),
          }),
        joinPath,
        dataSource:
          sql ?
            {
              type: "sql",
              sql,
              withStatement,
            }
          : {
              type: "table",
              joinPath,
            },
        sql,
      },
    });
  };

  const charts: {
    cols: ChartColumn[];
    onAdd: (cols: ChartColumn[], path: ParsedJoinPath[] | undefined) => any;
    label: "Map" | "Timechart";
    iconPath: string;
  }[] = [
    {
      label: "Map",
      iconPath: mdiMap,
      cols: geoCols,
      onAdd: (cols, path) => {
        onAdd({ type: "map", columns: cols }, path);
      },
    },
    {
      label: "Timechart",
      iconPath: mdiChartLine,
      cols: dateCols,
      onAdd: (cols, path) => {
        onAdd(
          {
            type: "timechart",
            columns: cols,
          },
          path,
        );
      },
    },
  ];

  return (
    <>
      {charts
        .map((c) => {
          const [firstCol] = c.cols;
          const isMap = c.label === "Map";
          const title = `Add ${c.label}`;
          const layerAlreadyAdded = myLinks
            .map(({ options: linkOpts, id }) => {
              if (linkOpts.type === "table") {
                return undefined;
              }

              const matches =
                linkOpts.type === c.label.toLowerCase() &&
                ((w.type === "sql" && sql?.trim() === linkOpts.sql?.trim()) ||
                  (w.type === "table" &&
                    c.cols.some((col) =>
                      linkOpts.columns.some((c) => c.name === col.name),
                    )));
              if (matches) return linkOpts.columns[0]?.colorArr;
            })
            .find(isDefined);

          const alreadyAddedButMinimisedOrNotVisibleChart =
            layerAlreadyAdded &&
            childWindows.some((cw) => {
              const addedButMinimised =
                cw.type === c.label.toLowerCase() && cw.minimised;
              const addedButNotVisible =
                cw.type === c.label.toLowerCase() &&
                childWindows.some(
                  (_cw) =>
                    _cw.type !== cw.type &&
                    !_cw.minimised &&
                    Number(_cw.last_updated) > Number(cw.last_updated),
                );
              return addedButMinimised || addedButNotVisible;
            });

          const btnProps: BtnProps = {
            title:
              alreadyAddedButMinimisedOrNotVisibleChart ? "Show chart" : title,
            size: size ?? "small",
            iconPath: c.iconPath,
            className: props.btnClassName,
            style: {
              minHeight: 0,
              color:
                layerAlreadyAdded ?
                  rgbaToString(layerAlreadyAdded as any)
                : undefined,
            },
            "data-command": `AddChartMenu.${c.label}`,
          };

          /**
           * If map and no joined columns then add all columns for render
           * Timechart can only render one date column
           */
          if (
            !layerAlreadyAdded &&
            ((c.label !== "Map" && c.cols.length > 1) ||
              c.cols.some((_c) => _c.type === "joined"))
          ) {
            return (
              <Select
                key={c.label}
                title={title}
                data-command={btnProps["data-command"]}
                btnProps={{
                  children: "",
                  variant: "default",
                  ...btnProps,
                }}
                fullOptions={c.cols.map((c, i) => ({
                  key: c.type === "joined" ? c.label : c.name,
                  label:
                    c.type === "joined" ? `> ${c.label} (${c.name})` : c.name,
                  ranking: (searchTerm) =>
                    getRankingFunc(
                      searchTerm,
                      c.type === "joined" ?
                        c.path.map((p) => p.table)
                      : [c.name],
                    ),
                }))}
                onChange={(colNameOrLabel) => {
                  const col = c.cols.find((col) =>
                    col.type === "joined" ?
                      col.label === colNameOrLabel
                    : col.name === colNameOrLabel,
                  );
                  c.onAdd(
                    [col!],
                    col?.type === "joined" ? col.path : undefined,
                  );
                }}
              />
            );
          }

          if (!firstCol && isMicroMode) {
            return undefined;
          }

          return (
            <Btn
              key={c.label}
              disabledInfo={
                alreadyAddedButMinimisedOrNotVisibleChart ? undefined
                : layerAlreadyAdded ?
                  t.AddChartMenu["Layer already added"]
                : !firstCol ?
                  t.AddChartMenu[
                    "No {{chartColumnDataType}} columns available"
                  ]({
                    chartColumnDataType:
                      isMap ? "geography/geometry" : "date/timestamp",
                  })
                : undefined
              }
              {...btnProps}
              onClick={() => {
                if (alreadyAddedButMinimisedOrNotVisibleChart) {
                  childWindows.forEach((cw) => {
                    if (cw.type === c.label.toLowerCase()) {
                      cw.$update({
                        minimised: false,

                        /** Hacky way to ensure it shows first if another chart is already visible */
                        created: new Date().toISOString(),
                      });
                    }
                  });
                } else {
                  c.onAdd(c.cols, undefined);
                }
              }}
            />
          );
        })
        .filter(isDefined)}
    </>
  );
};
