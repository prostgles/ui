import express, { json, Request, Response, urlencoded } from "express";
import _http from "http";
import type { AddressInfo } from "net";
import { getSerialisableError, isObject } from "prostgles-types";
import type { DBSSchema } from "../../../common/publishUtils";
import { isPortFree } from "./isPortFree";
import { runProstglesDBTool } from "../publishMethods/askLLM/prostglesLLMTools/runProstglesDBTool";
import { HTTP_FAIL_CODES } from "prostgles-server/dist/Auth/AuthHandler";
import { isDocker } from "..";

const route = "/db/:command";
const PREFERRED_PORT = 3009;
const HOST = isDocker ? "0.0.0.0" : "172.17.0.1";

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
 * A separate server is used because we need to bind it to 0.0.0.0 to ensure docker containers can access it.
 */
export const dockerMCPDatabaseRequestRouter = async (
  getChat: GetAuthContext,
) => {
  const app = express();

  app.use(json({ limit: "1000mb" }));
  app.use(urlencoded({ extended: true, limit: "1000mb" }));
  app.post(route, (req, res) => requestHandler(req, res, getChat));
  const http = _http.createServer(app);
  const usePreferredPort = await isPortFree(PREFERRED_PORT);

  return new Promise<{
    app: express.Express;
    server: _http.Server;
    address: AddressInfo;
    route: string;
  }>((resolve, reject) => {
    const server = http.listen(
      usePreferredPort ? PREFERRED_PORT : undefined,
      HOST,
      () => {
        const address = server.address();
        console.log("Docker MCP Router listening on", address);
        if (!isObject(address)) {
          reject(new Error("Server address is not an object"));
        } else {
          resolve({ app, server, address, route });
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
  const { command } = req.params;
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
    runProstglesDBTool(
      chat,
      { httpReq: req, res },
      req.body,
      //@ts-ignore
      command,
    )
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
