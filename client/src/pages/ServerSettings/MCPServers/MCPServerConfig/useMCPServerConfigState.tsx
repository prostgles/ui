import { useOnErrorAlert } from "@components/AlertProvider";
import { isEqual } from "prostgles-types";
import { useCallback, useMemo, useState } from "react";
import type { MCPServerConfigProps } from "./MCPServerConfig";

export const useMCPServerConfigState = (props: MCPServerConfigProps) => {
  const { serverName, existingConfig, dbs, onDone, chatId } = props;
  const [config, setConfig] = useState(existingConfig?.value ?? {});
  const canSave = useMemo(
    () => !isEqual(config, existingConfig?.value),
    [config, existingConfig?.value],
  );

  const serverInfo = dbs.mcp_servers.useSubscribeOne(
    {
      name: serverName,
    },
    {},
    { skip: !serverName },
  );
  const existingConfigData = dbs.mcp_server_configs.useSubscribe(
    {
      server_name: serverName,
    },
    {},
    { skip: !serverName },
  );
  const existingConfigs = useMemo(
    () => existingConfigData.data ?? [],
    [existingConfigData.data],
  );
  const schema = serverInfo.data?.config_schema;
  const { onErrorAlert } = useOnErrorAlert();

  const upsertConfig = useCallback(async () => {
    await onErrorAlert(async () => {
      const matchingConfig = existingConfigs.find(
        (ec) => ec.server_name === serverName && isEqual(ec.config, config),
      );

      const upsertedConfig =
        matchingConfig ??
        (await dbs.mcp_server_configs.insert(
          {
            server_name: serverName,
            config,
          },
          {
            returning: "*",
          },
        ));
      const configId = upsertedConfig.id;

      if (!configId) {
        throw new Error("Failed to save configuration.");
      }
      await dbs.mcp_servers.update(
        {
          name: serverName,
        },
        { enabled: true },
      );
      if (chatId) {
        await dbs.llm_chats_allowed_mcp_tools.update(
          {
            chat_id: chatId,
            server_name: serverName,
          },
          {
            server_config_id: configId,
          },
        );
      }
      onDone({ configId });
    }).catch((e) => {
      onDone();
    });
  }, [
    chatId,
    config,
    dbs.llm_chats_allowed_mcp_tools,
    dbs.mcp_server_configs,
    dbs.mcp_servers,
    existingConfigs,
    onDone,
    onErrorAlert,
    serverName,
  ]);

  return {
    upsertConfig,
    schema,
    config,
    setConfig,
    canSave,
    existingConfigs,
  };
};
