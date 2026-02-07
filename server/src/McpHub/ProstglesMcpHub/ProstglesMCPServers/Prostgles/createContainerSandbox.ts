import type { DBS } from "@src/index";
import { runContainerWithProxyAccess } from "../DockerSandbox/runContainerWithProxyAccess";
import type { DockerMCPServerProxyHandler } from "../DockerSandbox/dockerMCPServerProxy/dockerContainerAuthRegistry";
import { sidKeyName } from "@common/authTypesAndConstants";
import { Request, Response } from "express";
import { getSerialisableError, type JSONB } from "prostgles-types";
import type { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import { runProstglesDBTool } from "@src/serverFunctions/askLLM/prostglesLLMTools/runProstglesDBTool";
import type { McpCallContext } from "../../ProstglesMCPServerTypes";

const DB_ROUTE = `/db/:endpoint`;

export const createContainerSandbox = async (
  dbs: DBS,
  args: JSONB.GetType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["create_container"]["schema"]
  >,
  { chat_id, user_id }: McpCallContext,
) => {
  const chat = await dbs.llm_chats.findOne({ id: chat_id, user_id });
  if (!chat) {
    throw new Error(`Chat with id ${chat_id} not found`);
  }
  return runContainerWithProxyAccess(
    dbs,
    {
      user_id,
      chat,
      requestHandlers: {
        [DB_ROUTE]: {
          method: "POST",
          handler: dbRequestHandler,
        },
      },
    },
    args,
  );
};

export const dbRequestHandler: DockerMCPServerProxyHandler = (
  authContext,
  req: Request,
  res: Response,
) => {
  const { endpoint = "" } = req.params;
  try {
    const { chat, sid_token } = authContext;
    req.cookies ??= {};
    req.cookies[sidKeyName] = sid_token;
    runProstglesDBTool(chat, { httpReq: req, res }, req.body, endpoint)
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
