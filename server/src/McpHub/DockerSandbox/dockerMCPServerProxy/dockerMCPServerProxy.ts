import { sidKeyName } from "@common/authTypesAndConstants";
import { getEntries } from "@common/utils";
import type { CreateContainerParams } from "@src/McpHub/ProstglesMcpHub/ProstglesMCPServers/Prostgles/schemas/getCreateContainerToolSchema";
import { callMCPServerTool } from "@src/McpHub/callMCPServerTool";
import { isDocker } from "@src/McpHub/utils";
import { statePrgl } from "@src/init/startProstgles";
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
import { createBridgeInternalDockerNetwork } from "../createBridgeInternalDockerNetwork";
import {
  dockerContainerAuthRegistry,
  type ContainerProxyContext,
} from "./dockerContainerAuthRegistry";
import { getDockerGatewayIP } from "./getDockerGatewayIP";
import { createSessionSecret } from "@src/authConfig/sessionUtils";
import { tout } from "@src/utils/tout";

const PREFERRED_PORT = 3089;
const DEFAULT_GATEWAY_IP = "0.0.0.0" as const;
const MCP_PROXY_PREFIX = "/mcp-proxy/:secret" as const;

let dockerMCPServerProxy:
  | ReturnType<typeof createDockerMCPServerProxy>
  | undefined;

export const getOrCreateDockerMCPServerProxy = async () => {
  dockerMCPServerProxy ??= createDockerMCPServerProxy();
  return dockerMCPServerProxy;
};
export const getDockerMCPServerProxy = () => dockerMCPServerProxy;

/**
 * A separate server is used to improve security
 */
const createDockerMCPServerProxy = async () => {
  const dockerVersion = execSync("docker --version").toString();
  if (!dockerVersion) {
    throw new Error("Docker not installed");
  }
  const app = express();

  app.use(json({ limit: "1000mb" }));
  app.use(urlencoded({ extended: true, limit: "1000mb" }));

  const scopedProxyRouter = express.Router({ mergeParams: true });

  const authContextMiddleware: RequestHandler = (req, res, next) => {
    const { secret } = req.params as { secret?: string };
    const ip = req.ip || req.socket.remoteAddress || "";

    const authContext =
      secret ?
        dockerContainerAuthRegistry.getContainerFromSecret(secret.toString())
      : dockerContainerAuthRegistry.getContainerFromIP(ip);
    if (!authContext) {
      return res.status(HTTP_FAIL_CODES.UNAUTHORIZED).json({
        error:
          secret ?
            "Container and/or Chat not found for provided MCP secret"
          : "Container and/or Chat not found for the given IP address: " + ip,
      });
    }
    res.locals.authContext = authContext;
    next();
  };

  scopedProxyRouter.use(authContextMiddleware);
  scopedProxyRouter.post(MCP_ROUTE, mcpRequestHandler);

  const dockerProxyRouter: RequestHandler = async (req, res, next) => {
    const authContext = res.locals.authContext as ContainerProxyContext;
    const { sid_token, requestHandlers, secret, user, mcpToolsScope } =
      authContext;

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
      await handler(
        {
          sid_token,
          httpReq: req,
          res,
          secret,
          mcpToolsScope,
          user,
        },
        req,
        res,
        next,
      );
    } catch (error) {
      return res.status(500).json(getSerialisableError(error));
    }
  };

  scopedProxyRouter.use(dockerProxyRouter);

  const rootProxyRouter = express.Router();
  rootProxyRouter.use(MCP_PROXY_PREFIX, scopedProxyRouter);

  upsertNamedExpressMiddleware(
    app,
    rootProxyRouter,
    "docker-mcp-proxy-request-handlers",
  );

  const preferredPortIsFree = await isPortFree(PREFERRED_PORT);

  await createBridgeInternalDockerNetwork();
  const bridgeGatewayIP = getDockerGatewayIP("bridge");
  const bridgeInternalGatewayIP = getDockerGatewayIP("bridge-internal");
  const gateways =
    (
      isDocker ||
      [bridgeGatewayIP, bridgeInternalGatewayIP].includes(DEFAULT_GATEWAY_IP)
    ) ?
      [
        {
          network: "all" as const,
          listenHost: DEFAULT_GATEWAY_IP,
        },
      ]
    : [
        {
          network: "bridge" as const,
          listenHost: bridgeGatewayIP,
        },
        {
          network: "bridge-internal" as const,
          listenHost: bridgeInternalGatewayIP,
        },
      ];

  const instances = await Promise.all(
    gateways.map(({ listenHost, network }) => {
      const http = _http.createServer(app);
      return new Promise<{
        server: _http.Server;
        address: AddressInfo;
        network: "all" | "bridge" | "bridge-internal";
        port: number;
        destroy: () => void;
      }>((resolve, reject) => {
        const server = http.listen(
          preferredPortIsFree ? PREFERRED_PORT : undefined,
          listenHost,
          () => {
            const address = server.address();
            console.log(
              "Docker MCP Router listening on",
              address,
              "for network mode:",
              network,
            );
            if (!isObject(address)) {
              reject(new Error("Server address is not an object"));
            } else {
              const actualPort = address.port;
              resolve({
                server,
                address,
                network,
                port: actualPort,
                destroy: () => server.close(),
              });
            }
          },
        );
      });
    }),
  );

  return {
    instances,
    getBaseUrl: (
      networkMode: CreateContainerParams["networkMode"] = "bridge",
    ) => {
      const networkModeToUse =
        networkMode !== "bridge-internal" ? "bridge" : networkMode;
      const instance = instances.find(
        ({ network }) => network === "all" || network === networkModeToUse,
      );
      if (!instance) {
        throw new Error(
          `No Docker MCP server instance found for network mode: ${networkMode}`,
        );
      }
      const { port, network } = instance;

      const gateway =
        (
          network === "bridge-internal" ||
          networkModeToUse === "bridge-internal"
        ) ?
          bridgeInternalGatewayIP
        : bridgeGatewayIP;
      const baseUrl =
        isDocker ?
          `http://prostgles-ui-docker-mcp:${port}`
        : `http://${gateway}:${port}`;
      return baseUrl;
    },
    destroy: () => {
      instances.forEach(({ destroy }) => destroy());
    },
  };
};

const MCP_ROUTE = `/:server_name/:tool_name` as const;

const mcpRequestHandler: RequestHandler = async (
  req: Request,
  res: Response,
) => {
  const { server_name = "", tool_name } = req.params;
  try {
    const { user, sid_token, mcpToolsScope } = res.locals
      .authContext as ContainerProxyContext;

    if (!mcpToolsScope) {
      return res.status(HTTP_FAIL_CODES.UNAUTHORIZED).json({
        error: "MCP Tools scope chat not found in auth context",
      });
    }

    const dbs = statePrgl?.db;
    if (!dbs) {
      throw new Error("Database not initialized");
    }

    if (
      !server_name ||
      !tool_name ||
      typeof server_name !== "string" ||
      typeof tool_name !== "string"
    ) {
      return res.status(HTTP_FAIL_CODES.BAD_REQUEST).json({
        error:
          "Missing server_name or tool_name in request params. Expecting /serverName/toolName in the URL.",
      });
    }
    const { chat, messageId } = mcpToolsScope;
    const toolAllowedInfo = await dbs.llm_chats_allowed_mcp_tools.findOne({
      $existsJoined: {
        mcp_server_tools: {
          server_name,
          name: tool_name,
        },
      },
      chat_id: chat.id,
    });

    if (!toolAllowedInfo) {
      return res.status(HTTP_FAIL_CODES.UNAUTHORIZED).json({
        error: `Tool ${server_name}/${tool_name} is not allowed`,
      });
    }
    if (server_name === "prostgles-ui") {
      return res.status(HTTP_FAIL_CODES.BAD_REQUEST).json({
        error: `Tool server "prostgles-ui" is reserved for internal use and cannot be called directly.`,
      });
    }
    const timeoutMinutes = 5;
    const waitForApprovalTimeout = timeoutMinutes * 60 * 1000;
    const now = Date.now();
    let approvalRequestId: number | undefined = undefined;
    if (!toolAllowedInfo.auto_approve) {
      const toolUseId = `tool-use-${createSessionSecret().slice(0, 6)}`;
      const approval = await dbs.mcp_tool_approval_requests.insert(
        {
          chat_id: chat.id,
          user_id: user.id,
          message_id: null,
          tool_name,
          server_name,
          tool_use_id: toolUseId,
          response: null,
          input: req.body,
          source: {
            type: "proxy",
            parentToolUseMessageId: messageId,
          },
        },
        { returning: "*" },
      );
      let latestApproval: typeof approval | undefined = approval;
      let timedOut = false;
      do {
        await tout(1000);
        if (Date.now() - now >= waitForApprovalTimeout) {
          timedOut = true;
        }
        latestApproval = await dbs.mcp_tool_approval_requests.findOne({
          id: approval.id,
        });
      } while (latestApproval && !latestApproval.response && !timedOut);

      const approveFailReason =
        !latestApproval ? "Approval request not found"
        : latestApproval.response === "deny" ? "Tool use denied by user"
        : timedOut ?
          `Tool use not approved within timeout period of ${timeoutMinutes} minutes`
        : undefined;

      if (approveFailReason) {
        return res.status(HTTP_FAIL_CODES.UNAUTHORIZED).json({
          error: `Tool ${server_name}/${tool_name} failed: ${approveFailReason}. Tool must be approved in the UI or be set to auto-approve.`,
        });
      }
      approvalRequestId = approval.id;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    req.cookies ??= {};
    req.cookies[sidKeyName] = sid_token;
    const clientReq = { httpReq: req, res };
    callMCPServerTool({
      dbs,
      clientReq,
      chat_id: chat.id,
      user,
      serverName: server_name,
      toolName: tool_name,
      toolArguments: req.body,
      toolUseId: undefined,
      mcp_tool_approval_requests_id: approvalRequestId,
      messageId,
    })
      .then((result) => {
        res
          .status(result.isError ? HTTP_FAIL_CODES.BAD_REQUEST : 200)
          .json(result.structuredContent || result.content);
      })
      .catch((error) => {
        res
          .status(HTTP_FAIL_CODES.BAD_REQUEST)
          .json({ error: getSerialisableError(error) });
      });
  } catch (error) {
    console.error("Error in request handler:", error);
    return res
      .status(HTTP_FAIL_CODES.INTERNAL_SERVER_ERROR)
      .json({ error: "Internal server error" });
  }
};
