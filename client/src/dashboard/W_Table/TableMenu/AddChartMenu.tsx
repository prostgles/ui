import Btn, { type BtnProps } from "@components/Btn";
import { Icon } from "@components/Icon/Icon";
import { getSearchRanking } from "@components/SearchList/searchMatchUtils/getSearchRanking";
import { Select } from "@components/Select/Select";
import { SvgIcon } from "@components/SvgIcon";
import { mdiChartLine, mdiMap, mdiSetLeftCenter } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useMemoDeep } from "prostgles-client/dist/prostgles";
import { isDefined, type ParsedJoinPath } from "prostgles-types";
import React from "react";
import { addChart } from "src/dashboard/Dashboard/addChart";
import type { DeckGlColor } from "src/dashboard/Map/DeckGLMap";
import { t } from "../../../i18n/i18nUtils";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type { WindowData } from "../../Dashboard/dashboardUtils";
import { rgbaToString } from "../../W_Map/getMapFeatureStyle";
import type { ChartableSQL } from "../../W_SQL/getChartableSQL";
import type { ChartColumn } from "./getChartCols";
import { getChartCols } from "./getChartCols";

type P = Pick<
  CommonWindowProps,
  "myLinks" | "childWindows" | "getLinksAndWindows"
> & {
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
    chartableSQL,
    size,
    myLinks,
    childWindows,
    getLinksAndWindows,
  } = props;

  const { tables, dbs } = usePrgl();

  const isMicroMode = size === "micro";
  const chartCols = useMemoDeep(() => {
    const res = getChartCols(
      type === "table" ?
        { type: "table", w, tables }
      : { type: "sql", chartableSQL, w },
    );
    return res;
  }, [chartableSQL, tables, w, type]);

  const { geoCols, dateCols, sql, withStatement = "" } = chartCols;

  const onAdd = (linkOpts: {
    type: "map" | "timechart" | "barchart";
    columns: ChartColumn[];
    joinPath: ParsedJoinPath[] | undefined;
  }) => {
    const { windows } = getLinksAndWindows();
    void addChart({
      dbs,
      windows,
      myLinks,
      parentWindow: w,
      tables,
      newChart: {
        ...linkOpts,
        sql,
        withStatement,
      },
      existingChartWindow: undefined,
    });
  };

  const charts: {
    cols: ChartColumn[];
    onAdd: (cols: ChartColumn[], path: ParsedJoinPath[] | undefined) => any;
    label: "Map" | "Timechart" | "Barchart";
    iconPath: string;
  }[] = [
    {
      label: "Map",
      iconPath: mdiMap,
      cols: geoCols,
      onAdd: (cols, path) => {
        onAdd({ type: "map", columns: cols, joinPath: path });
      },
    },
    {
      label: "Timechart",
      iconPath: mdiChartLine,
      cols: dateCols,
      onAdd: (cols, path) => {
        onAdd({
          type: "timechart",
          columns: cols,
          joinPath: path,
        });
      },
    },
    // {
    //   label: "Barchart",
    //   iconPath: mdiChartBar,
    //   cols: barCols,
    //   onAdd: (cols, path) => {
    //     onAdd(
    //       {
    //         type: "barchart",
    //         columns: cols,
    //       },
    //       path,
    //     );
    //   },
    // },
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

              const linkColumns = linkOpts.columns.map((col) => col.name);
              const linkSql =
                linkOpts.dataSource?.type === "sql" ?
                  linkOpts.dataSource.sql
                : undefined;
              const matches =
                linkOpts.type === c.label.toLowerCase() &&
                ((w.type === "sql" && sql?.trim() === linkSql?.trim()) ||
                  (w.type === "table" &&
                    c.cols.some((col) => linkColumns.includes(col.name))));
              if (matches) {
                return linkOpts.columns[0]?.colorArr;
              }
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
                  rgbaToString(layerAlreadyAdded as DeckGlColor)
                : undefined,
            },
            "data-command":
              c.label === "Map" ? "AddChartMenu.Map" : "AddChartMenu.Timechart",
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
                  variant: "icon",
                  ...btnProps,
                }}
                fullOptions={c.cols.map((c) => {
                  const targetTable =
                    c.type === "joined" ?
                      tables.find((t) => t.name === c.path.at(-1)?.table)
                    : undefined;
                  return {
                    key: c.key,
                    label:
                      c.type === "joined" ? `${c.label} (${c.name})` : c.name,
                    leftContent:
                      targetTable ?
                        targetTable.icon ?
                          <SvgIcon className="text-1" icon={targetTable.icon} />
                        : <Icon className="text-1" path={mdiSetLeftCenter} />
                      : undefined,

                    ranking: (searchTerm) =>
                      getSearchRanking(
                        searchTerm,
                        c.type === "joined" ?
                          c.path.map((p) => p.table)
                        : [c.name],
                      ),
                  };
                })}
                onChange={(key) => {
                  const col = c.cols.find((col) => col.key === key);
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
