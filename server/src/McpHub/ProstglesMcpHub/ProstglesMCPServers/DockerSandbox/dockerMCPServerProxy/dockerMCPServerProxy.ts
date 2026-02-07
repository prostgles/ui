import { getEntries } from "@common/utils";
import { isDocker } from "@src/McpHub/utils";
import { isPortFree } from "@src/utils/isPortFree";
import { execSync } from "child_process";
import express, { json, urlencoded, type RequestHandler } from "express";
import _http from "http";
import type { AddressInfo } from "net";
import { match } from "path-to-regexp";
import { upsertNamedExpressMiddleware } from "prostgles-server";
import { HTTP_FAIL_CODES } from "prostgles-server/dist/Auth/AuthHandler";
import { isObject } from "prostgles-types";
import { getDockerGatewayIP } from "../getDockerGatewayIP";
import { dockerContainerAuthRegistry } from "./dockerContainerAuthRegistry";

const PREFERRED_PORT = 3089;

let dockerMCPServerProxy:
  | ReturnType<typeof createDockerMCPServerProxy>
  | undefined;

export const getOrCreateDockerMCPServerProxy = async (
  isElectron: boolean | undefined,
) => {
  dockerMCPServerProxy ??= createDockerMCPServerProxy(isElectron);
  return dockerMCPServerProxy;
};

export const getDockerMCPServerProxy = () => dockerMCPServerProxy;

/**
 * A separate server is used to improve security because we need to
 * bind it to 0.0.0.0 to ensure docker containers can access it.
 */
const createDockerMCPServerProxy = async (isElectron: boolean | undefined) => {
  const dockerVersion = execSync("docker --version").toString();
  if (!dockerVersion) {
    throw new Error("Docker not installed");
  }
  const app = express();

  app.use(json({ limit: "1000mb" }));
  app.use(urlencoded({ extended: true, limit: "1000mb" }));

  const dockerProxyRouter: RequestHandler = (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "";

    const authContext = dockerContainerAuthRegistry.getContainerFromIP(ip);
    if (!authContext) {
      return res.status(HTTP_FAIL_CODES.UNAUTHORIZED).json({
        error:
          "Container and/or Chat not found for the given IP address: " + ip,
      });
    }
    const { chat, sid_token, requestHandlers } = authContext;
    const matchedRequestHandler = getEntries(requestHandlers).find(([route]) =>
      match(route)(req.path),
    );
    if (!matchedRequestHandler) {
      return res.status(HTTP_FAIL_CODES.NOT_FOUND).json({
        error: "No request handler found for path: " + req.path,
      });
    }
    matchedRequestHandler[1].handler({ chat, sid_token }, req, res, next);
  };
  upsertNamedExpressMiddleware(
    app,
    dockerProxyRouter,
    "docker-mcp-proxy-request-handlers",
  );

  const http = _http.createServer(app);
  const preferredPortIsFree = await isPortFree(PREFERRED_PORT);

  const dockerGatewayIP = getDockerGatewayIP();
  const hostname = isDocker || isElectron ? "0.0.0.0" : dockerGatewayIP;

  return new Promise<{
    app: express.Express;
    server: _http.Server;
    address: AddressInfo;
    baseUrl: string;
    destroy: () => void;
  }>((resolve, reject) => {
    const server = http.listen(
      preferredPortIsFree ? PREFERRED_PORT : undefined,
      hostname,
      () => {
        const address = server.address();
        console.log("Docker MCP Router listening on", address);
        if (!isObject(address)) {
          reject(new Error("Server address is not an object"));
        } else {
          const actualPort = address.port;
          const baseUrl =
            isDocker ?
              `http://prostgles-ui-docker-mcp:${actualPort}`
            : `http://${dockerGatewayIP}:${actualPort}`;
          resolve({
            app,
            server,
            address,
            baseUrl,
            destroy: () => server.close(),
          });
        }
      },
    );
  });
};
