import type { WorkspaceInsertModel } from "@common/DashboardTypes";
import {
  isObject,
  type DBSSchema,
  type DBSSchemaForInsert,
} from "@common/publishUtils";
import type { Prgl } from "../../../App";
import { isDefined, omitKeys } from "prostgles-types";
import { CHIP_COLOR_NAMES } from "../../W_Table/ColumnMenu/ColumnDisplayFormat/ChipStylePalette";
import type { WindowData } from "src/dashboard/Dashboard/dashboardUtils";
import { aggFunctions } from "src/dashboard/W_Table/ColumnMenu/FunctionSelector";

export const loadGeneratedWorkspaces = async (
  basicWorkspaces: WorkspaceInsertModel[],
  tool_use_id: string,
  { dbs, connectionId, tables }: Pick<Prgl, "dbs" | "connectionId" | "tables">,
) => {
  const viewIdToIndex: Record<string, number> = {};
  const workspaces = basicWorkspaces.map((bw, i) => {
    const windows: Omit<
      DBSSchemaForInsert["windows"],
      "last_updated" | "user_id"
    >[] = bw.windows.map((bw, wIndex) => {
      viewIdToIndex[bw.id] = wIndex;
      if (bw.type === "map") {
        return {
          type: "map",
          title: bw.title,
          table_name: bw.table_name,
        };
      } else if (bw.type === "timechart") {
        return {
          type: "timechart",
          title: bw.title,
          table_name: bw.table_name,
        };
      } else if (bw.type === "table") {
        const columns = bw.columns?.map((c) => {
          return {
            ...c,
            show: true,
            style: c.styling && {
              type: "Conditional",
              conditions: c.styling.conditions.map((cond) => {
                // "textColor": "#ffffff",
                // "textColorDarkMode": "#2386d5",
                // "chipColor": "#673AB7"
                const style =
                  Object.entries(CHIP_COLOR_NAMES).find(
                    ([k]) => k === cond.chipColor,
                  )?.[1] ?? CHIP_COLOR_NAMES.blue!;
                return {
                  condition: cond.value,
                  operator: cond.operator,
                  textColor: style.textColor,
                  chipColor: style.color,
                  textColorDarkMode: style.textColorDarkMode,
                };
              }),
            },
          };
        });
        const { sort, filter, filterOperand, quickFilterGroups } = bw;
        return {
          type: "table",
          title: bw.title,
          columns,
          filter,
          options: {
            filterOperand,
            quickFilterGroups,
          } satisfies WindowData<"table">["options"],
          sort: sort
            ?.map((s) => {
              const nestedCol = columns?.find(
                (c) => c.name === s.key && c.nested,
              );
              if (nestedCol) {
                return {
                  ...s,
                  key: `${s.key}.value`,
                };
              }
              return s;
            })
            .filter(isDefined),
          table_name: bw.table_name,
        } satisfies Omit<
          DBSSchemaForInsert["windows"],
          "last_updated" | "user_id"
        >;
      } else if (bw.type === "barchart") {
        const {
          filter,
          filterOperand,
          quickFilterGroups,
          table_name,
          x_axis,
          y_axis_column,
          title,
        } = bw;

        const funcDef = aggFunctions.find(
          (f) =>
            f.key ===
            (x_axis === "count(*)" ? "$countAll" : "$" + x_axis.aggregation),
        )!;
        const xColName =
          x_axis === "count(*)" ? "Count" : (
            `${funcDef.label}(${x_axis.column})`
          );

        const columns: WindowData<"table">["columns"] = [
          {
            name: y_axis_column,
            show: true,
          },
          {
            name: xColName,
            show: true,
            computedConfig: {
              column: x_axis === "count(*)" ? undefined : x_axis.column,
              funcDef: {
                ...funcDef,
                subLabel: "",
              },
            },
            style: {
              type: "Barchart",
              barColor: "#0081A7",
              textColor: "",
            },
          },
        ];
        const otherColumns = tables.find((t) => t.name === table_name)?.columns;
        otherColumns?.forEach((col) => {
          if (col.name !== y_axis_column) {
            columns.push({
              name: col.name,
              show: false,
            });
          }
        });
        return {
          type: "table",
          title,
          table_name,
          columns,
          filter,
          options: {
            filterOperand,
            quickFilterGroups,
            hideEditRow: true,
          } satisfies WindowData<"table">["options"],
          sort: [{ key: "xColName", asc: false }],
        } satisfies Omit<
          DBSSchemaForInsert["windows"],
          "last_updated" | "user_id"
        >;
      }
      return omitKeys(
        {
          ...bw,
          name: bw.name || "Query",
        },
        ["id"],
      );
    });
    return {
      ...bw,
      user_id: undefined as any,
      last_updated: undefined as any,
      connection_id: connectionId,
      windows,
      source: {
        tool_use_id,
      },
      layout_mode: "fixed",
    } satisfies DBSSchemaForInsert["workspaces"] & {
      windows: Omit<
        DBSSchemaForInsert["windows"],
        "last_updated" | "user_id"
      >[];
    };
  });

  const insertedWorkspaces = await dbs.workspaces.insert(workspaces, {
    returning: "*",
  });

  const wspToWindow: {
    wspIndex: number;
    wIndex: number;
    insertedWindowId: string;
  }[] = [];

  /** Add links for charts */
  await Promise.all(
    basicWorkspaces.map(async (wsp, i) => {
      await Promise.all(
        wsp.windows.map(async (w, wIndex) => {
          const insertedWorkspace = insertedWorkspaces[i];
          const insertedWindows = (insertedWorkspace as any).windows as
            | DBSSchema["windows"][]
            | DBSSchema["windows"];
          // TODO fix bug where a single inserted window is not an array but an object
          const insertedWindow =
            isObject(insertedWindows) && !wIndex ?
              insertedWindows
            : insertedWindows[wIndex];
          if (
            (w.type === "map" || w.type === "timechart") &&
            insertedWorkspace
          ) {
            const insertedChart: DBSSchema["windows"] | undefined =
              insertedWindow;
            if (insertedChart) {
              const chartParentWindow = await dbs.windows.insert(
                {
                  type: "table",
                  table_name: w.table_name,
                  workspace_id: insertedWorkspace.id,
                  last_updated: undefined as any,
                  user_id: undefined as any,
                },
                { returning: "*" },
              );
              wspToWindow.push({
                wspIndex: i,
                wIndex,
                insertedWindowId: chartParentWindow.id,
              });
              await dbs.windows.update(
                { id: insertedChart.id },
                { parent_window_id: chartParentWindow.id },
              );
              await dbs.links.insert({
                w1_id: chartParentWindow.id,
                w2_id: insertedChart.id!,
                workspace_id: insertedWorkspace.id!,
                last_updated: undefined as any,
                user_id: undefined as any,
                options:
                  w.type === "map" ?
                    {
                      type: w.type,
                      columns: [
                        {
                          name: w.geo_column,
                          colorArr: [0, 129, 167, 255],
                        },
                      ],
                    }
                  : {
                      type: w.type,
                      columns: [
                        {
                          name: w.date_column,
                          statType:
                            w.y_axis === "count(*)" ?
                              undefined
                            : {
                                funcName: `$${w.y_axis.aggregation}` as any,
                                numericColumn: w.y_axis.column,
                              },
                          colorArr: [0, 129, 167, 255],
                        },
                      ],
                    },
              });
            }
          } else {
            wspToWindow.push({
              wspIndex: i,
              wIndex,
              insertedWindowId: insertedWindow.id,
            });
          }
        }),
      );
    }),
  );

  /** Update layouts with correct view id */
  await Promise.all(
    insertedWorkspaces.map(async (wsp, i) => {
      const layout = { ...(wsp.layout || {}) };
      const fixIds = (layout: any) => {
        if ("items" in layout) {
          layout.items.forEach((item: any) => {
            fixIds(item);
          });
        } else {
          const viewIndex = basicWorkspaces[i]?.windows.findIndex(
            (w) => w.id === layout.id,
          );
          const insertedWindowId = wspToWindow.find(
            (w) => w.wspIndex === i && w.wIndex === viewIndex,
          )?.insertedWindowId;
          layout.id =
            isDefined(insertedWindowId) ? insertedWindowId : layout.id;
        }
      };
      fixIds(layout);
      await dbs.workspaces.update({ id: wsp.id }, { layout });
    }),
  );

  console.log(basicWorkspaces);

  return insertedWorkspaces;
};
