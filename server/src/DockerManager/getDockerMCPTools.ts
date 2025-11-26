import { assertJSONBObjectAgainstSchema } from "prostgles-types";
import type { DBS } from "..";
import { getDockerManager } from "./DockerManager";
import { createContainerSchema } from "./createContainer.schema";
import type { McpToolCallResponse } from "@common/mcp";
import type { CreateContainerContext } from "./containerAuthStore";

export const getDockerMCPTools = async (dbs: DBS) => {
  const dockerManager = await getDockerManager(dbs);
  const tools = {
    createContainer: async (args: unknown, context: CreateContainerContext) => {
      assertJSONBObjectAgainstSchema(
        createContainerSchema.type,
        args,
        "createContainer args",
      );
      try {
        const containerResult = await dockerManager.createContainerInChat(
          args,
          context,
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Sandbox created successfully",
                  result: containerResult,
                },
                null,
                2,
              ),
            },
          ],
        } satisfies McpToolCallResponse;
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to create sandbox: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        } satisfies McpToolCallResponse;
      }
    },
  };
  return { tools, dockerManager };
};
