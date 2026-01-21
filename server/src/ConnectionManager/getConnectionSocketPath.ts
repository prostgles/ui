import type { DBSSchema } from "@common/publishUtils";
import { getConnectionApiPaths } from "@common/utils";

export const getConnectionSocketPath = (
  connection: DBSSchema["connections"],
) => {
  const socketPath = getConnectionApiPaths(connection).ws;
  const socketUrl =
    !connection.port ? undefined : `http://localhost:${connection.port}`;
  return { socketPath, socketUrl };
};
