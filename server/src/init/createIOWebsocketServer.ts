import { Server } from "socket.io";
import type { Server as httpServer } from "http";

export const createIOWebsocketServer = ({
  socketPath,
  http,
  allowedOrigin,
}: {
  socketPath: string;
  http: httpServer;
  allowedOrigin: string | null;
}) => {
  const ioConnection = new Server(http, {
    path: socketPath,
    maxHttpBufferSize: 1e8,
    cors: {
      origin: (_, cb) => {
        cb(null, allowedOrigin ?? undefined);
      },
    },
  });
  return { ioConnection };
};
