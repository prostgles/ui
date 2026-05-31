import { dbMcpSchema } from "./mcp/db.mcp.schema";
import { documentsMcpSchema } from "./mcp/documents.mcp.schema";
import { uiMcpSchema } from "./mcp/ui.mcp.schema";
import { webMcpConfigSchema, webMcpSchema } from "./mcp/web.mcp.schema";
import { webdevMcpSchema } from "./mcp/webdev.mcp.schema";
import type { DBSSchema } from "./publishUtils";

export const PROSTGLES_MCP_SERVERS_AND_TOOLS = {
  db: dbMcpSchema,
  "prostgles-ui": uiMcpSchema,
  web: webMcpSchema,
  webdev: webdevMcpSchema,
  documents: documentsMcpSchema,
} as const satisfies Record<
  string,
  Record<
    string,
    | string
    | {
        description: string;
        /**
         * Must be an object
         */
        schema: { type: any };
        outputSchema?: any;
        icon?: string;
        mode?: DBSSchema["mcp_server_tools"]["mode"];
        annotations?: DBSSchema["mcp_server_tools"]["annotations"];
      }
  >
>;

export const PROSTGLES_MCP_SERVER_CONFIGS = {
  web: webMcpConfigSchema,
} as const;
