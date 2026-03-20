import type { DBSSchema } from "@common/publishUtils";
import { getConnectionApiPaths } from "@common/utils";
import type { ConnectionHotReloadProperties } from "./getHotReloadConfigs";

export const getConnectionSocketPath = (
  connection: ConnectionHotReloadProperties,
) => {
  const socketPath = getConnectionApiPaths(connection).ws;
  const socketUrl =
    !connection.port ? undefined : `http://localhost:${connection.port}`;
  return { socketPath, socketUrl };
};
