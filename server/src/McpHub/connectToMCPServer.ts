import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  type StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { getSerialisableError } from "prostgles-types";
import { z } from "zod";
import { tout } from "..";
import type { McpConnection } from "./McpHub";
import type { McpServerEvents } from "./McpTypes";

const AutoApproveSchema = z.array(z.string()).default([]);

const StdioConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  autoApprove: AutoApproveSchema.optional(),
  disabled: z.boolean().optional(),
});

export const connectToMCPServer = (
  name: string,
  config: StdioServerParameters,
  { onLog, onTransportClose }: McpServerEvents,
): Promise<McpConnection> => {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return new Promise(async (resolve, reject) => {
    let log = "";
    try {
      const parsedConfig = StdioConfigSchema.safeParse(config);
      if (!parsedConfig.success)
        throw new Error(
          parsedConfig.error.errors.map((e) => e.message).join("\n"),
        );
      /** Clear previous logs and errors */
      await onLog("stderr", "", log);
      await onLog("error", "", log);
      // Each MCP server requires its own transport connection and has unique capabilities, configurations, and error handling.
      // Having separate clients also allows proper scoping of resources/tools and independent server management like reconnection.
      const client = new Client(
        {
          name: "Prostgles",
          version: "1.0.0",
        },
        {
          capabilities: {},
        },
      );

      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: {
          ...config.env,
          ...(process.env.PATH ? { PATH: process.env.PATH } : {}),
          // ...(process.env.NODE_PATH ? { NODE_PATH: process.env.NODE_PATH } : {}),
        },
        cwd: config.cwd,
        stderr: "pipe", // necessary for stderr to be available
      });

      transport.onerror = (error) => {
        const errMsg = `Transport error: ${error.message}`;
        log += errMsg;
        void onLog("error", errMsg, log);
        reject(errMsg);
      };
      transport.onclose = () => {
        onTransportClose();
        reject(new Error(`Transport closed`));
      };

      // valid schema
      const connection: McpConnection = {
        server: {
          name,
          config,
          status: "connecting",
          disabled: parsedConfig.data.disabled,
        },
        client,
        transport,
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
        stderrStream.on("data", (data: Buffer) => {
          const errorOutput = data.toString();
          log += errorOutput;
          void onLog("stderr", errorOutput, log);
        });
      } else {
        console.error(`No stderr stream for ${name}`);
      }
      transport.start = async () => {}; // No-op now, .connect() won't fail

      // Connect
      await client.connect(transport).catch(async (error) => {
        await tout(1000); // wait for connection to be established
        return Promise.reject(error);
      });
      connection.server.status = "connected";
      connection.server.error = "";
      resolve(connection);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      reject({ error: getSerialisableError(error), log });
    }
  });
};
