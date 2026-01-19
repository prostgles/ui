import type { DBSSchema } from "@common/publishUtils";
import { getConnectionPaths } from "@common/utils";

export const getConnectionSocketPath = (
  connection: DBSSchema["connections"],
) => {
  const socketPath = getConnectionPaths(connection).ws;
  const socketUrl =
    !connection.port ? undefined : `http://localhost:${connection.port}`;
  return { socketPath, socketUrl };
};
