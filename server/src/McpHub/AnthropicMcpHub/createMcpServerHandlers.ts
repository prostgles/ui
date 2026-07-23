import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  ListPromptsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  ListToolsResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

export const createMcpServerHandlers = (client: Client) => {
  const fetchPrompts = async () => {
    const prompts = await client.request(
      {
        method: "prompts/list",
      },
      ListPromptsResultSchema,
    );
    return prompts;
  };

  const fetchToolsList = async () => {
    try {
      const response = await client.request(
        { method: "tools/list" },
        ListToolsResultSchema,
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
    } catch (_error) {
      return [];
    }
  };

  const fetchResourcesList = async () => {
    const response = await client.request(
      { method: "resources/list" },
      ListResourcesResultSchema,
    );
    return response.resources;
  };

  const fetchResourceTemplatesList = async () => {
    const response = await client.request(
      { method: "resources/templates/list" },
      ListResourceTemplatesResultSchema,
    );
    return response.resourceTemplates;
  };

  return {
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
    } catch (_error) {
      /** Error ignored because for some reason servers withour resources trigger a McpError: MCP error -32601: Method not found */
      return [] as T;
    }
  };
};
