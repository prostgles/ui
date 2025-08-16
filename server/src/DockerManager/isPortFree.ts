import { createServer } from "net";

export const isPortFree = (
  port: number,
  host = "localhost",
): Promise<boolean> => {
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
