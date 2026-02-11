import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type {
  ProstglesMcpServerDefinition,
  ProstglesMcpServerHandler,
  ProstglesMcpServerHandlerTyped,
} from "../../ProstglesMCPServerTypes";

import { fromEntries, getEntries } from "@common/utils";
import type { McpTool } from "@src/McpHub/AnthropicMcpHub/McpTypes";
import { buildWebApp } from "@src/serverFunctions/adminServerFunctions/webApp/buildWebApp";
import { getValidatedWebAppPath } from "@src/serverFunctions/adminServerFunctions/webApp/getValidatedWebAppPath";
import { readWebAppFiles } from "@src/serverFunctions/adminServerFunctions/webApp/readWebAppFiles";
import { runDockerForWebApp } from "@src/serverFunctions/adminServerFunctions/webApp/runDockerForWebApp";
import { testWebApp } from "@src/serverFunctions/adminServerFunctions/webApp/testWebApp";
import { writeWebAppFiles } from "@src/serverFunctions/adminServerFunctions/webApp/writeWebAppFiles";
import { glob } from "glob";
import { basename, join } from "path";
import { getJSONBSchemaAsJSONSchema, omitKeys } from "prostgles-types";
import { getWebDevChatAndConnection } from "./tools/getWebDevChatAndConnection";
import { searchWebDevFiles } from "./tools/searchWebDevFiles";

const toolsSchema = PROSTGLES_MCP_SERVERS_AND_TOOLS["webdev"];

const definition = {
  icon_path: "React",
  label: "Web Dev Environment",
  description: "React vite based web development environment.",
  tools: toolsSchema,
} as const satisfies ProstglesMcpServerDefinition;

const handler = {
  start: (dbs) => {
    return {
      stop: () => {},
      tools: {
        list_directory: async ({ directoryPath }, { chat, connection_id }) => {
          const { web_app_directory } = await getWebDevChatAndConnection(dbs, {
            chat,
            connection_id,
          });

          const { filePath } = getValidatedWebAppPath({
            web_app_directory,
            relativePath: directoryPath || "/",
          });
          const result = await glob("*", {
            cwd: filePath,
            absolute: false,
            nodir: false,
            maxDepth: 1,
          });
          const limit = 100;
          if (result.length > limit) {
            return [...result.slice(0, limit), "[...truncated]"];
          }
          return result;
        },
        read_files: async ({ filePaths }, { chat, connection_id }) => {
          await getWebDevChatAndConnection(dbs, {
            chat,
            connection_id,
          });
          const result = await readWebAppFiles(
            { connectionId: connection_id, filePaths },
            { dbo: dbs },
          );
          return result;
        },
        search_files: async (
          { query, extensions },
          { chat, connection_id },
        ) => {
          const { web_app_directory } = await getWebDevChatAndConnection(dbs, {
            chat,
            connection_id,
          });
          const { result } = await searchWebDevFiles({
            contentQuery: query,
            extensions,
            web_app_directory,
            folder: "client",
          });
          return result;
        },
        create_component: async (
          { entryPoint, dependencies, devDependencies, files, test },
          { chat, connection_id },
        ) => {
          const { web_app_directory } = await getWebDevChatAndConnection(dbs, {
            chat,
            connection_id,
          });
          const componentFile = basename(entryPoint);
          const componentName = componentFile.split(".")[0];
          if (!entryPoint.includes(`src/components/${componentName}`)) {
            throw "Entry point must be inside src/components/[componentName]/";
          }

          const clientFiles = fromEntries(
            getEntries(files).map(([filePath, file]) => {
              return [join("client", filePath), file];
            }),
          );

          const testFile = {
            [join("e2e", "tests", `${componentName}.spec.ts`)]: {
              content: test,
            },
          };

          if (dependencies?.length || devDependencies?.length) {
            const commands: string[] = [];
            if (dependencies?.length) {
              commands.push(`npm install --silent ${dependencies.join(" ")}`);
            }
            if (devDependencies?.length) {
              commands.push(
                `npm install --silent -D ${devDependencies.join(" ")}`,
              );
            }
            const installDepsResult = await runDockerForWebApp({
              web_app_directory,
              image: "node:20-slim",
              shCommand: `cd client && ${commands.join(" && ")}`,
            });

            if (installDepsResult.state !== "close") {
              return Promise.reject(installDepsResult);
            }
          }

          await writeWebAppFiles(
            {
              connectionId: connection_id,
              files: {
                ...clientFiles,
                ...testFile,
              },
            },
            {
              dbo: dbs,
            },
          );

          const buildResult = await buildWebApp(
            { connectionId: connection_id },
            { dbo: dbs },
          );

          if (buildResult.state !== "close") {
            return Promise.reject(buildResult);
          }

          const testResult = await testWebApp(
            { connectionId: connection_id },
            {
              dbo: dbs,
            },
          );
          return { testResult };
        },
      },
      fetchTools: () => {
        return getEntries(toolsSchema).map(([tool_name, tool_info]) => ({
          name: tool_name,
          description: tool_info.description,
          inputSchema: omitKeys(
            getJSONBSchemaAsJSONSchema("", "", tool_info.schema),
            ["$id", "$schema"],
          ) as McpTool["inputSchema"],
        }));
      },
    };
  },
} satisfies ProstglesMcpServerHandlerTyped<typeof definition>;

export const WebDevMCPServer = {
  definition,
  handler: handler as ProstglesMcpServerHandler,
};
