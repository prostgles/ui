import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";
import type { DBS } from "@src/index";
import type { JSONB } from "prostgles-types";
import { DEFAULT_AGENT_MODEL } from "./refreshModels";

export const getCreateAgentInputWithDefaults = async (
  input: JSONB.GetType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["create_agent"]["schema"]
  >,
  chatId: number,
  dbs: DBS,
) => {
  const serverNames = Object.keys(input.tools ?? {});
  const chatTools =
    !serverNames.length ? [] : (
      await dbs.llm_chats_allowed_mcp_tools.find(
        {
          chat_id: chatId,
          server_name: { $in: serverNames },
          server_config_id: { $ne: null },
        },
        { select: { server_name: 1, server_config_id: 1 } },
      )
    );
  const mcpServerConfigs: NonNullable<typeof input.mcpServerConfigs> = {};
  chatTools.forEach(({ server_name, server_config_id }) => {
    if (server_config_id) {
      mcpServerConfigs[server_name] = { configId: server_config_id };
    }
  });
  const serverNamesWithoutConfig = serverNames.filter(
    (serverName) =>
      !mcpServerConfigs[serverName] && !input.mcpServerConfigs?.[serverName],
  );
  if (serverNamesWithoutConfig.length) {
    const availableConfigs = await dbs.mcp_server_configs.find(
      { server_name: { $in: serverNamesWithoutConfig } },
      { select: { server_name: 1, configId: { $max: ["id"] } } },
    );
    availableConfigs.forEach(({ server_name, configId }) => {
      mcpServerConfigs[server_name] = { configId: Number(configId) };
    });
  }

  return {
    ...input,
    modelName: input.modelName ?? DEFAULT_AGENT_MODEL,
    mcpServerConfigs: { ...mcpServerConfigs, ...input.mcpServerConfigs },
  };
};
