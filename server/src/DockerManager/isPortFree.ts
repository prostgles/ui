import { createServer } from "net";

export const isPortFree = (port: number): Promise<boolean> => {
  /**
   * We must check all interfaces
   */
  const host = "0.0.0.0";
  return new Promise((resolve) => {
    const server = createServer();

    server.listen(port, host, () => {
      server.once("close", () => {
        resolve(true);
      });
      server.close();
    });

    server.on("error", () => {
      resolve(false);
    });
  });
};
