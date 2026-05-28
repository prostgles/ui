import type { DBSSchema } from "@common/publishUtils";
import { type DBS } from "@src/index";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";
import { type JSONB } from "prostgles-types";
import type { McpTool } from "../AnthropicMcpHub/McpTypes";

export type LocalConfigSchema = JSONB.ObjectType["type"];

export type ProstglesMcpServerDefinition = {
  icon_path: string;
  label: string;
  description: string;
  config_schema: LocalConfigSchema | undefined;
  config_schema_component: string | undefined;
  tools: Record<
    string,
    {
      description: string;
      schema: JSONB.FieldTypeObj | undefined;
      outputSchema: JSONB.FieldType | undefined;
      icon?: string;
      mode?: DBSSchema["mcp_server_tools"]["mode"];
    }
  >;
};

export type JSONBTypeIfDefined<Schema extends JSONB.FieldType | undefined> =
  Schema extends JSONB.FieldType ? JSONB.GetType<Schema> : undefined;

export type JSONBObjectTypeIfDefined<
  Schema extends LocalConfigSchema | undefined,
> =
  Schema extends LocalConfigSchema ? JSONB.GetType<{ type: Schema }>
  : undefined;

type MaybePromise<T> = T | Promise<T>;

export type McpCallContext = {
  chat: DBSSchema["llm_chats"];
  connection_id: string;
  user_id: DBSSchema["users"]["id"];
  clientReq: AuthClientRequest;
  dbs: DBS;
  toolUseId: string | undefined;
  messageId: DBSSchema["llm_messages"]["id"];
} & Pick<
  DBSSchema["llm_chats_allowed_mcp_tools"],
  "tool_id" | "server_config_id"
>;

export type McpCallContextFetchTools = {
  mcpTools: {
    name: string;
    server_name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown> | null;
  }[];
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
    (
      toolArguments: unknown,
      context: McpCallContext,
      config: unknown,
    ) => MaybePromise<unknown>
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
        config: JSONBObjectTypeIfDefined<ServerDefinition["config_schema"]>,
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
