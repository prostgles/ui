import * as net from "net";

export const isPortFree = async (
  port: number,
  host = "127.0.0.1",
): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net
      .createServer()
      .once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") resolve(false);
        else resolve(false);
      })
      .once("listening", () => {
        server.close(() => resolve(true));
      })
      .listen(port, host);
  });
};
