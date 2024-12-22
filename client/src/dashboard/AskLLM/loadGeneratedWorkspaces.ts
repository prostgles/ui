import type { WorkspaceInsertModel } from "../../../../commonTypes/DashboardTypes";
import { isObject, type DBSSchema } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import { isDefined, omitKeys } from "prostgles-types";
import { CHIP_COLOR_NAMES } from "../W_Table/ColumnMenu/ColumnDisplayFormat/ChipStylePalette";

export const loadGeneratedWorkspaces = async (
  basicWorkspaces: WorkspaceInsertModel[],
  { dbs, connectionId }: Pick<Prgl, "dbs" | "connectionId">,
) => {
  const viewIdToIndex: Record<string, number> = {};
  const workspaces = basicWorkspaces.map((bw, i) => {
    const windows = bw.windows.map((bw, wIndex) => {
      viewIdToIndex[bw.id] = wIndex;
      if (bw.type === "map") {
        return {
          type: "map",
          table_name: bw.table_name,
        };
      } else if (bw.type === "timechart") {
        return {
          type: "timechart",
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
                // "chipColor": "#673AB7"\
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
        const { sort, filter } = bw;
        return {
          type: "table",
          columns,
          filter,
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
        };
      }
      return omitKeys(
        {
          ...bw,
          name: bw.id || "Query",
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
                  workspace_id: insertedWorkspace.id!,
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
