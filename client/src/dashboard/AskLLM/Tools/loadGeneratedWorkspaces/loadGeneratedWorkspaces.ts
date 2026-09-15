import type { WorkspaceInsertModel } from "@common/DashboardTypes";
import {
  isObject,
  type DBSSchema,
  type DBSSchemaForInsert,
} from "@common/publishUtils";
import { isDefined, omitKeys } from "prostgles-types";
import type { Prgl } from "../../../../App";
import { loadGeneratedBarchart } from "./loadGeneratedBarchart";
import { loadGeneratedMap } from "./loadGeneratedMap";
import { loadGeneratedTable } from "./loadGeneratedTable";
import { loadGeneratedTimechart } from "./loadGeneratedTimechart";

export const loadGeneratedWorkspaces = async (
  generatedWorkspaces: WorkspaceInsertModel[],
  tool_use_id: string,
  {
    // db,
    dbs,
    connectionId,
    tables,
  }: Pick<Prgl, "dbs" | "connectionId" | "tables">,
) => {
  const workspaces = generatedWorkspaces.map((workspace) => {
    const windows: WindowInsertModel[] = workspace.windows.map(
      (generatedWindow) => {
        if (generatedWindow.type === "barchart") {
          return loadGeneratedBarchart(generatedWindow, tables);
        } else if (generatedWindow.type === "map") {
          const { window } = loadGeneratedMap(generatedWindow);
          return window;
        } else if (generatedWindow.type === "timechart") {
          const { window } = loadGeneratedTimechart(generatedWindow);
          return window;
        } else if (generatedWindow.type === "table") {
          return loadGeneratedTable(generatedWindow, tables);
        }
        return omitKeys(
          {
            ...generatedWindow,
            name: generatedWindow.name || "Query",
          },
          ["id"],
        );
      },
    );
    return {
      ...workspace,
      options: {
        pinnedMenu: false,
      },
      user_id: undefined as unknown as string,
      last_updated: undefined as unknown as string,
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

  const insertedWorkspaces = await dbs.workspaces.insertMany(workspaces, {
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
                DBSSchema["windows"][] | DBSSchema["windows"];
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
                  await dbs.links.insertMany(
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
