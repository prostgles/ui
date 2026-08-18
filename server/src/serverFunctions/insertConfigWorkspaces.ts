import type { LayoutConfig } from "@common/DashboardTypes";
import type { DBGeneratedSchema } from "@common/DBGeneratedSchema";
import { randomUUID } from "crypto";
import { connectionManager, type DBS } from "../index";

export type Users = Required<DBGeneratedSchema["users"]["columns"]>;
export type Connections = Required<DBGeneratedSchema["connections"]["columns"]>;

import { getSchemaConfig } from "../ConnectionManager/getSchemaConfig";

/** TODO: this must reuse loadGeneratedWorkspaces function  */
export const insertConfigWorkspaces = async (
  connectionId: string,
  dbs: DBS,
  userId: string,
) => {
  const connection =
    connectionManager.getActiveConnectionSilentFail(connectionId);
  if (!connection) return;
  const workspaces = getSchemaConfig(connection.dbConf.config_sync)?.config
    .workspaces;
  if (!workspaces?.length) return;

  const existingWorkspaces = await dbs.workspaces.find({
    connection_id: connectionId,
    user_id: userId,
    name: { $in: workspaces.map(({ name }) => name) },
  });
  const existingNames = new Set(existingWorkspaces.map(({ name }) => name));
  const lastUpdated = Date.now().toString();
  const newWorkspaces = workspaces
    .filter(({ name }) => !existingNames.has(name))
    .map((workspace) => {
      const windowIds = new Map(
        workspace.windows.map(({ id }) => [id, randomUUID()]),
      );
      const layout = structuredClone(workspace.layout);
      const replaceLayoutIds = (item: LayoutConfig) => {
        const replacementId = windowIds.get(item.id);
        if (replacementId) item.id = replacementId;
        if ("items" in item) item.items.forEach(replaceLayoutIds);
        if (item.type === "tab" && item.activeTabKey) {
          item.activeTabKey =
            windowIds.get(item.activeTabKey) ?? item.activeTabKey;
        }
      };
      replaceLayoutIds(layout);

      return {
        ...workspace,
        connection_id: connectionId,
        last_updated: lastUpdated,
        user_id: userId,
        layout,
        windows: workspace.windows.map((window) => ({
          ...window,
          id: windowIds.get(window.id),
          last_updated: lastUpdated,
          user_id: userId,
        })),
      };
    });

  if (newWorkspaces.length) {
    await dbs.workspaces.insertMany(newWorkspaces);
  }
};
