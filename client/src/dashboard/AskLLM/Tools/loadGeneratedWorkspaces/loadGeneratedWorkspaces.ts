import type { WorkspaceInsertModel } from "@common/DashboardTypes";
import {
  isObject,
  type DBSSchema,
  type DBSSchemaForInsert,
} from "@common/publishUtils";
import { isDefined, omitKeys } from "prostgles-types";
import type { WindowData } from "src/dashboard/Dashboard/dashboardUtils";
import type { Prgl } from "../../../../App";
import { CHIP_COLOR_NAMES } from "../../../W_Table/ColumnMenu/ColumnDisplayFormat/ChipStylePalette";
import { loadGeneratedBarchart } from "./loadGeneratedBarchart";
import { loadGeneratedMap } from "./loadGeneratedMap";
import { loadGeneratedTimechart } from "./loadGeneratedTimechart";

export const loadGeneratedWorkspaces = async (
  generatedWorkspaces: WorkspaceInsertModel[],
  tool_use_id: string,
  { dbs, connectionId, tables }: Pick<Prgl, "dbs" | "connectionId" | "tables">,
) => {
  const workspaces = generatedWorkspaces.map((wsp, i) => {
    const windows: WindowInsertModel[] = wsp.windows.map((generatedWindow) => {
      if (generatedWindow.type === "barchart") {
        return loadGeneratedBarchart(generatedWindow, tables);
      } else if (generatedWindow.type === "map") {
        const { window } = loadGeneratedMap(generatedWindow);
        return window;
      } else if (generatedWindow.type === "timechart") {
        const { window } = loadGeneratedTimechart(generatedWindow);
        return window;
      } else if (generatedWindow.type === "table") {
        const columns = generatedWindow.columns?.map((c) => {
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
        const { sort, filter, filterOperand, quickFilterGroups } =
          generatedWindow;
        return {
          type: "table",
          title: generatedWindow.title,
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
          table_name: generatedWindow.table_name,
        } satisfies Omit<
          DBSSchemaForInsert["windows"],
          "last_updated" | "user_id"
        >;
      }
      return omitKeys(
        {
          ...generatedWindow,
          name: generatedWindow.name || "Query",
        },
        ["id"],
      );
    });
    return {
      ...wsp,
      options: {
        pinnedMenu: false,
      },
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
    generatedWorkspaces.map(
      async (generatedWorkspace, generatedWorkspaceIndex) => {
        await Promise.all(
          generatedWorkspace.windows.map(
            async (generatedWindow, generatedWindowIndex) => {
              const insertedWorkspace =
                insertedWorkspaces[generatedWorkspaceIndex];
              const insertedWindows = (insertedWorkspace as any).windows as
                | DBSSchema["windows"][]
                | DBSSchema["windows"];
              // TODO fix bug where a single inserted window is not an array but an object
              const insertedWindow =
                isObject(insertedWindows) && !generatedWindowIndex ?
                  insertedWindows
                : insertedWindows[generatedWindowIndex];

              const generatedWindowChartOptions =
                generatedWindow.type === "map" ?
                  loadGeneratedMap(generatedWindow)
                : generatedWindow.type === "timechart" ?
                  loadGeneratedTimechart(generatedWindow)
                : undefined;

              wspToWindow.push({
                wspIndex: generatedWorkspaceIndex,
                wIndex: generatedWindowIndex,
                insertedWindowId: insertedWindow.id,
              });

              if (generatedWindowChartOptions && insertedWorkspace) {
                const insertedChart: DBSSchema["windows"] | undefined =
                  insertedWindow;
                if (insertedChart) {
                  await dbs.links.insert(
                    generatedWindowChartOptions.linkOptions.map((options) => {
                      return {
                        w1_id: insertedChart.id,
                        w2_id: insertedChart.id,
                        workspace_id: insertedWorkspace.id,
                        options,
                        last_updated: undefined as any,
                        user_id: undefined as any,
                      };
                    }),
                  );
                }
              }
            },
          ),
        );
      },
    ),
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
          const viewIndex = generatedWorkspaces[i]?.windows.findIndex(
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

  console.log(generatedWorkspaces);

  return insertedWorkspaces;
};

export type WindowInsertModel = Omit<
  DBSSchemaForInsert["windows"],
  "last_updated" | "user_id"
>;

export type LinkOption = DBSSchema["links"]["options"];
