import type { Server as httpServer } from "http";
import { Server } from "socket.io";
import type { HttpAppSecurityOptions } from "./setHttpAppSecurity";
import type { DBSSchema } from "@common/publishUtils";
import { getCorsOptions } from "./getCorsOptions";

export const createIOWebsocketServer = (
  {
    socketPath,
    http,
    cors,
    cors_csp_devmode_enabled,
  }: {
    socketPath: string;
    http: httpServer;
  } & Pick<HttpAppSecurityOptions, "cors" | "cors_csp_devmode_enabled">,
  { is_state_db, port }: Pick<DBSSchema["connections"], "is_state_db" | "port">,
  stateAppPort: number,
) => {
  const corsOptions = getCorsOptions(
    { cors, cors_csp_devmode_enabled },
    { is_state_db, port },
    stateAppPort,
  );
  const ioConnection = new Server(http, {
    path: socketPath,
    maxHttpBufferSize: 1e8,
    cors: corsOptions,
  });
  return { ioConnection };
};
