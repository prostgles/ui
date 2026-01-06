import type { DBSSchemaForInsert } from "./publishUtils";

export type MCPServerInfo = Omit<
  DBSSchemaForInsert["mcp_servers"],
  "id" | "cwd" | "enabled" | "name"
> & {
  mcp_server_tools?: Omit<
    DBSSchemaForInsert["mcp_server_tools"],
    "id" | "server_name"
  >[];
};

export type McpToolCallResponse = {
  _meta?: Record<string, any>;
  content: Array<
    | {
        type: "text";
        text: string;
      }
    | {
        type: "image" | "audio";
        data: string;
        mimeType: string;
      }
    | {
        type: "resource";
        resource: {
          uri: string;
          mimeType?: string;
          text?: string;
          blob?: string;
        };
      }
    | {
        type: "resource_link";
        uri: string;
        name: string;
        mimeType?: string;
        description?: string;
      }
  >;
  isError?: boolean;
};

export const DEFAULT_MCP_SERVER_NAMES = [
  "filesystem",
  "fetch",
  "git",
  "github",
  "google-maps",
  "memory",
  "playwright",
  "websearch",
  "docker-sandbox",
  "slack",
] as const;
