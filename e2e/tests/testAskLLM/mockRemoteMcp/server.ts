import { randomUUID } from "crypto";
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();
app.use(express.json());

const PORT = 3000;

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

// TODO: CIMD
// const ORIGIN = "http://localhost:" + PORT;
// const cimdMetadata = {
//   // In CIMD, the client_id IS the URL where this JSON lives
//   client_id: ORIGIN + "/metadata.json",
//   client_name: "CIMD Test Client",
//   client_uri: ORIGIN,
//   redirect_uris: [ORIGIN + "http://localhost:4000/callback"],
// };

// app.post("/set_redirect_uri_for_test", (req, res) => {
//   const redirectUri = req.query.redirect_uri;
//   if (typeof redirectUri !== "string") {
//     return res.status(400).json({ error: "Missing redirect_uri query param" });
//   }

//   cimdMetadata.redirect_uris = [redirectUri];
//   res.json({ success: true, redirect_uris: cimdMetadata.redirect_uris });
// });

// 1. Host the metadata (Keycloak will fetch this automatically)
// app.get("/metadata.json", (req, res) => res.json(cimdMetadata));

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
