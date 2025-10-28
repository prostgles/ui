import express, { json, Request, Response, urlencoded } from "express";
import _http from "http";
import type { AddressInfo } from "net";
import { HTTP_FAIL_CODES } from "prostgles-server/dist/Auth/AuthHandler";
import { getSerialisableError, isObject } from "prostgles-types";
import { isDocker } from "..";
import type { DBSSchema } from "@common/publishUtils";
import { getProstglesState } from "../init/tryStartProstgles";
import { runProstglesDBTool } from "../publishMethods/askLLM/prostglesLLMTools/runProstglesDBTool";
import { getDockerGatewayIP } from "./getDockerGatewayIP";
import { isPortFree } from "./isPortFree";
import { execSync } from "child_process";

const PREFERRED_PORT = 3009;
export const DOCKER_MCP_ENDPOINT = "/db";
const ROUTE = `${DOCKER_MCP_ENDPOINT}/:endpoint`;

export type ChatPermissions = Pick<
  DBSSchema["llm_chats"],
  "db_data_permissions" | "connection_id"
>;

type AuhtContext = {
  sid_token: string;
  chat: ChatPermissions;
};

export type GetAuthContext = (ip: string) => AuhtContext | undefined;

/**
 * A separate server is used to improve security because we need to bind it to 0.0.0.0 to ensure docker containers can access it.
 */
export const dockerMCPDatabaseRequestRouter = async (
  getChat: GetAuthContext,
) => {
  const dockerVersion = execSync("docker --version").toString();
  if (!dockerVersion) throw new Error("Docker not installed");
  const app = express();

  app.use(json({ limit: "1000mb" }));
  app.use(urlencoded({ extended: true, limit: "1000mb" }));
  app.post(ROUTE, (req, res) => requestHandler(req, res, getChat));
  const http = _http.createServer(app);
  const usePreferredPort = await isPortFree(PREFERRED_PORT);

  const dockerGatewayIP = getDockerGatewayIP();
  const host =
    isDocker || getProstglesState().isElectron ? "0.0.0.0" : dockerGatewayIP;

  return new Promise<{
    app: express.Express;
    server: _http.Server;
    address: AddressInfo;
    api_url: string;
  }>((resolve, reject) => {
    const server = http.listen(
      usePreferredPort ? PREFERRED_PORT : undefined,
      host,
      () => {
        const address = server.address();
        console.log("Docker MCP Router listening on", address);
        if (!isObject(address)) {
          reject(new Error("Server address is not an object"));
        } else {
          const actualPort = address.port;
          const api_url =
            isDocker ?
              `http://prostgles-ui-docker-mcp:${actualPort}${ROUTE}`
            : `http://${dockerGatewayIP}:${actualPort}${ROUTE}`;
          resolve({ app, server, address, api_url });
        }
      },
    );
  });
  // const { app, http } = connMgr;

  // app.post(route, (req, res) => requestHandler(req, res, getChat));
  // await tout(100);
  // const address = http.address();
  // if (!isObject(address)) {
  //   throw new Error("Server address is not an object");
  // }
  // return {
  //   app,
  //   route,

  //   // server: http.serce;
  //   address,
  // };
};

const requestHandler = (
  req: Request,
  res: Response,
  getChat: GetAuthContext,
) => {
  const { endpoint = "" } = req.params;
  try {
    const ip = req.ip || req.socket.remoteAddress || "";

    const authContext = getChat(ip);
    if (!authContext) {
      return res
        .status(HTTP_FAIL_CODES.UNAUTHORIZED)
        .send(
          "Container and/or Chat not found for the given IP address: " + ip,
        );
    }
    const { chat, sid_token } = authContext;
    req.cookies ??= {};
    req.cookies.sid_token = sid_token;
    runProstglesDBTool(chat, { httpReq: req, res }, req.body, endpoint)
      .then((result) => {
        res.json(result);
      })
      .catch((error) => {
        res.status(400).json({ error: getSerialisableError(error) });
      });
  } catch (error) {
    console.error("Error in request handler:", error);
    return res.status(500).send("Internal server error");
  }
};
