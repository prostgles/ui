import { sidKeyName } from "@common/authTypesAndConstants";
import { getEntries } from "@common/utils";
import { isDocker } from "@src/McpHub/utils";
import { runProstglesDBTool } from "@src/serverFunctions/askLLM/prostglesLLMTools/runProstglesDBTool";
import { isPortFree } from "@src/utils/isPortFree";
import { execSync } from "child_process";
import express, {
  json,
  Request,
  Response,
  urlencoded,
  type RequestHandler,
} from "express";
import _http from "http";
import type { AddressInfo } from "net";
import { match } from "path-to-regexp";
import { upsertNamedExpressMiddleware } from "prostgles-server";
import { HTTP_FAIL_CODES } from "prostgles-server/dist/Auth/AuthHandler";
import { getSerialisableError, isObject } from "prostgles-types";
import {
  dockerContainerAuthRegistry,
  type ContainerProxyContext,
} from "./dockerContainerAuthRegistry";
import { getDockerGatewayIP } from "./getDockerGatewayIP";

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

  const authContextMiddleware: RequestHandler = (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "";

    const authContext = dockerContainerAuthRegistry.getContainerFromIP(ip);
    if (!authContext) {
      return res.status(HTTP_FAIL_CODES.UNAUTHORIZED).json({
        error:
          "Container and/or Chat not found for the given IP address: " + ip,
      });
    }
    res.locals.authContext = authContext;
    next();
  };
  upsertNamedExpressMiddleware(
    app,
    authContextMiddleware,
    "docker-mcp-proxy-auth-context",
  );

  app.post(DB_ROUTE, dbRequestHandler);

  const dockerProxyRouter: RequestHandler = async (req, res, next) => {
    const authContext = res.locals.authContext as ContainerProxyContext;
    const { dbPermissions, sid_token, requestHandlers } = authContext;

    const matchedRequestHandler = getEntries(requestHandlers ?? {}).find(
      ([route]) => {
        return match(route)(req.path);
      },
    );
    if (!matchedRequestHandler) {
      return res.status(HTTP_FAIL_CODES.NOT_FOUND).json({
        error: "No request handler found for path: " + req.path,
      });
    }
    const { handler } = matchedRequestHandler[1];
    try {
      await handler({ dbPermissions, sid_token }, req, res, next);
    } catch (error) {
      return res.status(500).json(getSerialisableError(error));
    }
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

const DB_ROUTE = `/db/:endpoint`;

const dbRequestHandler: RequestHandler = (req: Request, res: Response) => {
  const authContext = res.locals.authContext as ContainerProxyContext;
  const { endpoint = "" } = req.params;
  try {
    const { dbPermissions, sid_token } = authContext;
    const { mode = "none" } = dbPermissions?.db_data_permissions || {};
    if (!dbPermissions || mode === "none") {
      return res.status(HTTP_FAIL_CODES.UNAUTHORIZED).json({
        error: "No database permissions granted for this container",
      });
    }
    req.cookies ??= {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    req.cookies[sidKeyName] = sid_token;
    runProstglesDBTool(dbPermissions, { httpReq: req, res }, req.body, endpoint)
      .then((result) => {
        res.json(result);
      })
      .catch((error) => {
        res.status(400).json({ error: getSerialisableError(error) });
      });
  } catch (error) {
    console.error("Error in request handler:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
