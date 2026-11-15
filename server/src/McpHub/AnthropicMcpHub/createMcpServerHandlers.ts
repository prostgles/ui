import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  CallToolResultSchema,
  ErrorCode,
  McpError,
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

export const createMcpServerHandlers = (
  client: Client,
  runRequest: <T>(request: () => Promise<T>) => Promise<T> = (request) =>
    request(),
) => {
  const fetchPrompts = async () => {
    const prompts = await runRequest(() =>
      client.request(
        {
          method: "prompts/list",
        },
        ListPromptsResultSchema,
      ),
    );
    return prompts;
  };

  const fetchToolsList = async () => {
    try {
      const response = await runRequest(() =>
        client.request({ method: "tools/list" }, ListToolsResultSchema),
      );

      const tools = response.tools.map(
        ({
          /* Exclude mode as it is a prostgles-specific setting */
          // @ts-expect-error
          mode,
          ...tool
        }) => ({
          ...tool,
          description: tool.description ?? "",
        }),
      );
      return tools;
    } catch (error) {
      if (
        error instanceof McpError &&
        error.code === Number(ErrorCode.MethodNotFound)
      )
        return [];
      throw error;
    }
  };

  const fetchResourcesList = async () => {
    const response = await runRequest(() =>
      client.request({ method: "resources/list" }, ListResourcesResultSchema),
    );
    return response.resources;
  };

  const fetchResourceTemplatesList = async () => {
    const response = await runRequest(() =>
      client.request(
        { method: "resources/templates/list" },
        ListResourceTemplatesResultSchema,
      ),
    );
    return response.resourceTemplates;
  };

  const callTool = async (
    toolName: string,
    toolArguments:
      | {
          [x: string]: unknown;
        }
      | undefined,
  ) => {
    const toolResult = await runRequest(() =>
      client.request(
        {
          method: "tools/call",
          params: {
            name: toolName,
            arguments: toolArguments,
          },
        },
        CallToolResultSchema,
      ),
    );
    return toolResult;
  };

  const readResource = async (uri: string) => {
    const resourceResult = await runRequest(() =>
      client.request(
        {
          method: "resources/read",
          params: {
            uri,
          },
        },
        ReadResourceResultSchema,
      ),
    );
    return resourceResult;
  };

  return {
    callTool,
    readResource,
    fetchPrompts: returnEmptyOnError(fetchPrompts),
    fetchToolsList: returnEmptyOnError(fetchToolsList),
    fetchResourcesList: returnEmptyOnError(fetchResourcesList),
    fetchResourceTemplatesList: returnEmptyOnError(fetchResourceTemplatesList),
  };
};

const returnEmptyOnError = <T>(request: () => Promise<T>) => {
  return async () => {
    try {
      const data = await request();
      return data;
    } catch (error) {
      /* Servers may not support resources or prompts. Other errors must preserve stored tools. */
      if (
        error instanceof McpError &&
        error.code === Number(ErrorCode.MethodNotFound)
      )
        return [] as T;
      throw error;
    }
  };
};
