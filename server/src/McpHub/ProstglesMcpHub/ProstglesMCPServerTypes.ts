import type { DBSSchema } from "@common/publishUtils";
import { type DBS } from "@src/index";
import { type JSONB } from "prostgles-types";
import type { McpTool } from "../AnthropicMcpHub/McpTypes";
import type { AuthClientRequest } from "prostgles-server/dist/Auth/AuthTypes";

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
    }
  >;
  // config_schema: JSONB.FieldType | undefined;
};

export type JSONBTypeIfDefined<Schema extends JSONB.FieldType | undefined> =
  Schema extends JSONB.FieldType ? JSONB.GetType<Schema> : undefined;

type MaybePromise<T> = T | Promise<T>;

export type McpCallContext = {
  chat_id: DBSSchema["llm_chats"]["id"];
  user_id: DBSSchema["users"]["id"];
  clientReq: AuthClientRequest;
};

export type ProstglesMcpServerHandler = {
  start: (
    // config: unknown,
    dbs: DBS,
  ) => MaybePromise<ProstglesMcpServerHandlerInstance>;
};
export type ProstglesMcpServerHandlerInstance = {
  stop: () => MaybePromise<void>;
  fetchTools: (
    dbs: DBS,
    context: McpCallContext,
  ) => MaybePromise<
    {
      name: string;
      description: string;
      inputSchema: McpTool["inputSchema"];
    }[]
  >;
  tools: Record<
    string,
    (toolArguments: unknown, context: McpCallContext) => MaybePromise<unknown>
  >;
};

export type ProstglesMcpServerHandlerTyped<
  ServerDefinition extends Omit<
    ProstglesMcpServerDefinition,
    "handler"
  > = ProstglesMcpServerDefinition,
> = {
  start: (
    // config: JSONBTypeIfDefined<ServerDefinition["config_schema"]>,
    dbs: DBS,
  ) => MaybePromise<{
    stop: () => MaybePromise<void>;
    fetchTools: (
      dbs: DBS,
      context: McpCallContext,
    ) => MaybePromise<
      {
        name: string;
        description: string;
        inputSchema: McpTool["inputSchema"];
      }[]
    >;

    tools: {
      [ToolName in keyof ServerDefinition["tools"]]: (
        toolArguments: JSONBTypeIfDefined<
          ServerDefinition["tools"][ToolName]["schema"]
        >,
        context: McpCallContext,
      ) => MaybePromise<unknown>;
    };
    // JSONBTypeIfDefined<ServerDefinition["tools"][ToolName]["outputSchema"]>
  }>;
};
