import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { tout } from "@src/utils/tout";
import { getSerialisableError } from "prostgles-types";
import type { McpConnection } from "./McpHub";
import {
  MCP_CLIENT_INFO,
  type McpServerEvents,
  type McpServerParameters,
} from "./McpTypes";
import { connectToRemoteMCPServer } from "./McpOAuth/connectToRemoteMCPServer";
import { createMcpServerHandlers } from "./createMcpServerHandlers";

export type MCPServerInitInfo = McpServerEvents & {
  name: string;
  server_name: string;
  parameters: McpServerParameters;
};

export const connectToMCPServer = async ({
  name,
  server_name,
  parameters,
  onLog,
  onTransportClose,
}: MCPServerInitInfo): Promise<
  | {
      success: true;
      connection: McpConnection;
    }
  | {
      success: false;
      error: unknown;
      log: string;
    }
> => {
  let log = "";
  try {
    // Each MCP server requires its own transport connection and has unique capabilities, configurations, and error handling.
    // Having separate clients also allows proper scoping of resources/tools and independent server management like reconnection.
    const client = new Client(MCP_CLIENT_INFO, {
      capabilities: {},
    });

    if (parameters.type === "remote") {
      const connection = await connectToRemoteMCPServer({
        name,
        server_name,
        client,
        parameters,
        onLog,
        onTransportClose,
        appendToLog: (chunk: string) => {
          log += chunk;
        },
        getFullLog: () => log,
      });
      return { success: true, connection };
    }

    const transport = new StdioClientTransport({
      command: parameters.command,
      args: parameters.args,
      env: {
        ...parameters.env,
        ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
        // ...(process.env.NODE_PATH ? { NODE_PATH: process.env.NODE_PATH } : {}),
      },
      cwd: parameters.cwd,
      stderr: "pipe", // necessary for stderr to be available
    });
    // transport.onmessage = (message) => {
    //   console.log(`MCP Server ${name} message:`, message);
    // };

    transport.onerror = (error) => {
      const errMsg = `Transport error: ${error.message}`;
      log += errMsg;
      void onLog({ type: "error", data: error }, log);
      // reject(errMsg);
    };
    transport.onclose = () => {
      onTransportClose();
      // reject(new Error(`Transport closed`));
    };

    const connection: McpConnection = {
      server_name,
      server: {
        name,
        config: parameters,
        status: "connecting",
      },
      client,
      transport,
      handlers: createMcpServerHandlers(client),
      destroy: async () => {
        try {
          await transport.close();
          await client.close();
        } catch (error) {
          console.error(`Failed to close transport for ${name}:`, error);
        }
      },
    };

    // transport.stderr is only available after the process has been started. However we can't start it separately from the .connect() call because it also starts the transport. And we can't place this after the connect call since we need to capture the stderr stream before the connection is established, in order to capture errors during the connection process.
    // As a workaround, we start the transport ourselves, and then monkey-patch the start method to no-op so that .connect() doesn't try to start it again.
    await transport.start();
    const stderrStream = transport.stderr;
    if (stderrStream) {
      transport.stderr.on("data", (data: Buffer) => {
        const errorOutput = data.toString();
        log += errorOutput;
        void onLog({ type: "stderr", data: errorOutput }, log);
      });
    } else {
      console.error(`No stderr stream for ${name}`);
    }
    transport.start = async () => {}; // No-op now, .connect() won't fail

    await client.connect(transport).catch(async (error) => {
      await tout(1000); // wait for connection to be established
      return Promise.reject(error);
    });
    connection.server.status = "connected";
    connection.server.error = "";
    return { success: true, connection };
  } catch (error) {
    return { success: false, error: getSerialisableError(error), log };
  }
};
