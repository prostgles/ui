import { createServer } from "net";

export const isPortFree = async (port: number): Promise<boolean> => {
  const result = await tryPort(port);
  return result === port;
};

export const getFreePort = async (preferredPort?: number): Promise<number> => {
  if (preferredPort) {
    const isFree = await isPortFree(preferredPort);
    if (isFree) return preferredPort;
  }
  const port = await tryPort(undefined);
  if (!port) throw new Error("Could not find a free port");
  return port;
};

const tryPort = (port: number | undefined): Promise<number | undefined> => {
  /**
   * We must check all interfaces
   */
  const host = "0.0.0.0";
  return new Promise((resolve) => {
    const server = createServer();

    server.listen(port, host, () => {
      const address = server.address();
      const actualPort =
        typeof address === "object" && address ? address.port : undefined;
      server.once("close", () => {
        resolve(actualPort);
      });
      server.close();
    });

    server.on("error", () => {
      resolve(undefined);
    });
  });
};
