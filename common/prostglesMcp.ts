import { dbMcpSchema } from "./mcp/db.mcp.schema";
import type { DBSSchema } from "./publishUtils";
import { uiMcpSchema } from "./mcp/ui.mcp.schema";
import { webdevMcpSchema } from "./mcp/webdev.mcp.schema";
import { websearchMcpSchema } from "./mcp/websearch.mcp.schema";
import { documentsMcpSchema } from "./mcp/documents.mcp.schema";

export const PROSTGLES_MCP_SERVERS_AND_TOOLS = {
  db: dbMcpSchema,
  "prostgles-ui": uiMcpSchema,
  websearch: websearchMcpSchema,
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
        mode?: DBSSchema["mcp_server_tools"]["mode"];
        annotations?: DBSSchema["mcp_server_tools"]["annotations"];
      }
  >
>;
