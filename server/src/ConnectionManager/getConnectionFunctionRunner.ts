import type { ConnectionDetails } from "@src/connectionUtils/getConnectionDetails";
import type { Connections, DatabaseConfigs, DBS } from "..";
import type { ConnectionManager } from "./ConnectionManager";
import { ForkedPrglProcRunner } from "./ForkedPrglProcRunner/ForkedPrglProcRunner";

export const getConnectionFunctionRunner = async ({
  connection,
  connectionInfo,
  connectionManager,
  databaseConfig,
  dbs,
}: {
  dbs: DBS;
  connection: Pick<Connections, "id" | "db_watch_shema">;
  connectionManager: ConnectionManager;
  databaseConfig: DatabaseConfigs;
  connectionInfo: ConnectionDetails;
}) => {
  const watchSchema = connection.db_watch_shema ? "*" : undefined;
  if (
    !connectionManager.getActiveConnectionSilentFail(connection.id)
      ?.methodRunner
  ) {
    const methodRunner = await ForkedPrglProcRunner.create({
      type: "run",
      dbConfId: databaseConfig.id,
      pass_process_env_vars_to_server_side_functions:
        databaseConfig.pass_process_env_vars_to_server_side_functions,
      dbs,
      prglInitOpts: {
        dbConnection: {
          ...connectionInfo,
          application_name: "methodRunner",
        },
        watchSchema,
      },
    });

    const activeConnection = connectionManager.getActiveConnection(
      connection.id,
    );
    connectionManager.prglConnections.set(connection.id, {
      ...activeConnection,
      methodRunner,
    });
  }
  const forkedPrglProcRunner = connectionManager.getActiveConnection(
    connection.id,
  ).methodRunner;
  return forkedPrglProcRunner!;
};
