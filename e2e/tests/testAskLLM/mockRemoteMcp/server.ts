import { randomUUID } from "crypto";
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(express.json());

const createMcpServer = () => {
  const mcpServer = new Server(
    { name: "mock-oauth-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "test_tool",
        description: "A dummy tool behind OAuth",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  }));

  return mcpServer;
};

app.get("/.well-known/oauth-protected-resource/mcp", (_req, res) => {
  res.json({
    resource: "http://localhost:3000/mcp",
    authorization_servers: ["http://localhost:8080/realms/mcp"],
  });
});

app.use("/mcp", (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.setHeader(
      "WWW-Authenticate",
      'Bearer resource_metadata="http://localhost:3000/.well-known/oauth-protected-resource/mcp"',
    );
    return res.status(401).send("Unauthorized");
  }

  next();
});

const transports = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];

  if (typeof sessionId === "string") {
    const transport = transports.get(sessionId);
    if (!transport) {
      return res.status(404).json({ error: "Unknown MCP session" });
    }

    return transport.handleRequest(req, res, req.body);
  }

  if (req.body?.method !== "initialize") {
    return res.status(400).json({
      error: "An initialize request is required before using MCP tools",
    });
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: randomUUID,
    onsessioninitialized: (newSessionId) => {
      transports.set(newSessionId, transport);
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  };

  await createMcpServer().connect(transport);
  return transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];

  if (typeof sessionId !== "string") {
    return res.status(400).json({ error: "Missing mcp-session-id header" });
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    return res.status(404).json({ error: "Unknown MCP session" });
  }

  return transport.handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];

  if (typeof sessionId !== "string") {
    return res.status(400).json({ error: "Missing mcp-session-id header" });
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    return res.status(404).json({ error: "Unknown MCP session" });
  }

  return transport.handleRequest(req, res);
});

app.listen(3000, () => {
  console.log("Mock MCP server listening on port 3000");
});
