import type { DBSSchema } from "@common/publishUtils";
import { type DBS } from "@src/index";
import { type JSONB } from "prostgles-types";
import type { McpTool } from "../AnthropicMcpHub/McpTypes";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import type { DBTool } from "@src/serverFunctions/askLLM/prostglesLLMTools/getAllowedDBToolSchemas";

export type ProstglesMcpServerDefinition = {
  icon_path: string;
  label: string;
  description: string;
  tools: Record<
    string,
    {
      description: string;
      schema: JSONB.FieldTypeObj | undefined;
      outputSchema: JSONB.FieldType | undefined;
      mode?: DBSSchema["mcp_server_tools"]["mode"];
    }
  >;
};

export type JSONBTypeIfDefined<Schema extends JSONB.FieldType | undefined> =
  Schema extends JSONB.FieldType ? JSONB.GetType<Schema> : undefined;

type MaybePromise<T> = T | Promise<T>;

export type McpCallContext = {
  chat: DBSSchema["llm_chats"];
  connection_id: string;
  user_id: DBSSchema["users"]["id"];
  clientReq: AuthClientRequest;
  dbs: DBS;
  toolUseId: string | undefined;
};

export type McpCallContextFetchTools = McpCallContext & {
  /**
   * List of db tools allowed in this chat.
   * Used for docker container description
   */
  dbTools: DBTool[];
  mcpTools: {
    name: string;
    server_name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown> | null;
  }[];
  chat: DBSSchema["llm_chats"];
  toolsAllowed: {
    tool_id: number;
    tool_name: string;
  }[];
};
export type ProstglesMcpServerHandler = {
  start: (dbs: DBS) => MaybePromise<ProstglesMcpServerHandlerInstance>;
};
export type ProstglesMcpServerHandlerInstance = {
  stop: () => MaybePromise<void>;
  fetchTools: (
    dbs: DBS,
    context: McpCallContextFetchTools,
  ) => MaybePromise<
    Record<
      string,
      | undefined
      | {
          name: string;
          description: string;
          inputSchema: McpTool["inputSchema"];
        }
    >
  >;
  tools: Record<
    string,
    (toolArguments: unknown, context: McpCallContext) => MaybePromise<unknown>
  >;
};

export type ProstglesMcpServerHandlerTypedFetchTools<
  Tools extends ProstglesMcpServerDefinition["tools"],
> = (
  dbs: DBS,
  context: McpCallContextFetchTools,
) => MaybePromise<
  Record<
    keyof Tools,
    | {
        name: string;
        description: string;
        inputSchema: McpTool["inputSchema"];
      }
    | undefined
  >
>;

export type ProstglesMcpServerHandlerTyped<
  ServerDefinition extends Omit<
    ProstglesMcpServerDefinition,
    "handler"
  > = ProstglesMcpServerDefinition,
> = {
  start: (dbs: DBS) => MaybePromise<{
    stop: () => MaybePromise<void>;
    fetchTools: ProstglesMcpServerHandlerTypedFetchTools<
      ServerDefinition["tools"]
    >;

    tools: {
      [ToolName in keyof ServerDefinition["tools"]]: (
        toolArguments: JSONBTypeIfDefined<
          ServerDefinition["tools"][ToolName]["schema"]
        >,
        context: McpCallContext,
      ) => MaybePromise<
        JSONBTypeIfDefined<ServerDefinition["tools"][ToolName]["outputSchema"]>
      >;
    };
  }>;
};

export type ProstglesMcpServerTool<
  ServerDefinition extends ProstglesMcpServerDefinition,
  ToolName extends keyof ServerDefinition["tools"],
> = (
  toolArguments: JSONBTypeIfDefined<
    ServerDefinition["tools"][ToolName]["schema"]
  >,
  context: McpCallContext,
) => MaybePromise<unknown>;
