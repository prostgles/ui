import type { WorkspaceInsertModel } from "@common/DashboardTypes";
import { connectionManager } from "@src/index";
import { statePrgl } from "@src/init/startProstgles";
import { defineFunction } from "prostgles-server";
import { defineFunctionGroupFunctions } from "../defineFunctionGroup";
import { loadGeneratedWorkspaces } from "./loadGeneratedWorkspaces";

export const { loadGeneratedWorkspaces: loadGeneratedWorkspacesFunction } =
  defineFunctionGroupFunctions({
    loadGeneratedWorkspaces: defineFunction({
      input: {
        connectionId: "string",
        workspaces: { arrayOf: "any" },
        toolUseId: { type: "string", optional: true },
      },
      run: async (
        { connectionId, workspaces, toolUseId },
        { dbo: dbs, user, clientReq, withClientDbTx },
      ) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!dbs.workspaces.insert) {
          throw new Error("Not allowed to create workspaces");
        }
        const connection = await dbs.connections.findOne({
          id: connectionId,
        });
        if (!connection) throw new Error("Connection not found");
        const prgl =
          connection.is_state_db ? statePrgl : (
            connectionManager.getConnectionStartedInstance(connectionId).prgl
          );
        if (!prgl) throw new Error("Connection not ready");
        const { clientSchema } = await prgl.getClientDBHandlers(
          clientReq,
          undefined,
        );
        return withClientDbTx((tx) =>
          loadGeneratedWorkspaces(workspaces as WorkspaceInsertModel[], {
            dbs: tx,
            connectionId,
            tables: clientSchema.tableSchema,
            userId: user.id,
            toolUseId,
          }),
        );
      },
    }),
  });
