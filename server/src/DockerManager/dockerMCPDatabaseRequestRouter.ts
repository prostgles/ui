import express, { json, Request, Response, urlencoded } from "express";
import _http from "http";
import type { AddressInfo } from "net";
import {
  assertJSONBObjectAgainstSchema,
  isDefined,
  isObject,
} from "prostgles-types";
import { connMgr } from "..";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "../../../commonTypes/prostglesMcp";

const route = "/db";

type ChatPermissions = Pick<
  DBSSchema["llm_chats"],
  "db_data_permissions" | "connection_id"
>;

export const dockerMCPDatabaseRequestRouter = (
  getChat: (ip: string) => ChatPermissions | undefined,
) => {
  const app = express();

  app.use(json({ limit: "1000mb" }));
  app.use(urlencoded({ extended: true, limit: "1000mb" }));
  app.post(route, (req, res) => requestHandler(req, res, getChat));
  const http = _http.createServer(app);

  /** Bind to 172.17.0.1 to an available port */
  return new Promise<{
    app: express.Express;
    server: _http.Server;
    address: AddressInfo;
    route: string;
  }>((resolve, reject) => {
    const server = http.listen(undefined, "172.17.0.1", () => {
      const address = server.address();
      console.log("Docker MCP Router listening on", address);
      if (!isObject(address)) {
        reject(new Error("Server address is not an object"));
      } else {
        resolve({ app, server, address, route });
      }
    });
  });
};

const requestHandler = (
  req: Request,
  res: Response,
  getChat: (ip: string) => ChatPermissions | undefined,
) => {
  void (async () => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "";
      const [p1, p2, p3] = ip.split(".");
      if (p1 !== "172" || p2 !== "17" || p3 !== "0") {
        return res
          .status(400)
          .send("Invalid IP address. Only local requests are allowed.");
      }
      const containerChat = getChat(ip);
      if (!containerChat) {
        return res
          .status(404)
          .send("Container and/or Chat not found for the given IP address.");
      }
      const dbPermissions = containerChat.db_data_permissions;
      if (!dbPermissions || dbPermissions.Mode === "None") {
        return res
          .status(403)
          .send("No database permissions set for this chat.");
      }
      if (dbPermissions.Mode === "Custom") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const args = req.body;
        assertJSONBObjectAgainstSchema(
          {
            tableName: "string",
            command: { enum: ["select", "insert", "update", "delete"] },
          } as const,
          args,
          "Custom database request",
        );
        const { tableName, command } = args;
      }
      const { connection_id } = containerChat;
      if (!isDefined(connection_id)) {
        return res.status(400).send("No connection ID found for this chat.");
      }
      const connection = connMgr.getConnection(connection_id);

      // req.cookies.sid = "";
      const { clientDb } = await connection.prgl.getClientDBHandlers({
        res,
        httpReq: req,
      });

      try {
        const args = req.body;
        assertJSONBObjectAgainstSchema(
          PROSTGLES_MCP_SERVERS_AND_TOOLS["prostgles-db"][
            "execute_sql_with_rollback"
          ].schema.type,
          args,
          "sql request",
        );
        const { sql } = args;
        const result = await clientDb.sql(sql);
        return res.json(result);
      } catch (error) {
        return res.status(400).json(error);
      }

      // must merge this logic with prostgles local
    } catch (error) {
      console.error("Error in request handler:", error);
      return res.status(500).send("Internal server error");
    }
  })();
};
