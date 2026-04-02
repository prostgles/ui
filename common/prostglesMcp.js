import { dbMcpSchema } from "./mcp/db.mcp.schema";
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
};
