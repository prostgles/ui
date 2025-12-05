import Btn from "@components/Btn";
import { isEqual } from "prostgles-types";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import Popup from "@components/Popup/Popup";
import React, { useContext, useMemo, useState } from "react";
import type { DBS } from "../../../../dashboard/Dashboard/DBS";
import { useOnErrorAlert } from "@components/AlertProvider";

export type MCPServerEnabledConfig = { configId: number };

export type MCPServerConfigProps = {
  dbs: DBS;
  serverName: string;
  existingConfig: { id: number; value: Record<string, string> } | undefined;
  chatId: number | undefined;
  onDone: (res: void | MCPServerEnabledConfig) => void;
};

export const MCPServerConfig = (props: MCPServerConfigProps) => {
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
  const existingConfigs = existingConfigData.data ?? [];
  const schema = serverInfo.data?.config_schema;
  const { onErrorAlert } = useOnErrorAlert();
  if (!schema) return null;

  return (
    <Popup
      title={`Configure and enable ${JSON.stringify(serverName)} MCP server`}
      positioning="center"
      onClose={() => onDone()}
      data-command="MCPServerConfig"
      rootStyle={{
        maxWidth: "min(600px, 100vw)",
      }}
      clickCatchStyle={{ opacity: 1 }}
      footerButtons={[
        {
          label: "Cancel",
          onClick: () => onDone(),
        },
        {
          label: existingConfig ? "Update" : "Enable",
          "data-command": "MCPServerConfig.save",
          disabledInfo: canSave ? undefined : "No changes",
          variant: "filled",
          color: "action",
          className: "ml-auto",
          onClickPromise: async () => {
            await onErrorAlert(async () => {
              const matchingConfig = existingConfigs.find(
                (ec) =>
                  ec.server_name === serverName && isEqual(ec.config, config),
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
          },
        },
      ]}
    >
      <FlexCol>
        {Object.entries(schema).map(([key, schema]) => (
          <FormField
            type="text"
            key={key}
            label={schema.title ?? key}
            hint={schema.description}
            value={config[key]}
            onChange={(v) =>
              setConfig({
                ...config,
                [key]: v,
              })
            }
          />
        ))}
        {Boolean(existingConfigs.length) && (
          <FlexCol className="pt-1 pb-2 gap-p5">
            <div className="ta-start">
              Or select from existing configurations:
            </div>
            <FlexRowWrap>
              {existingConfigs.map((existingConfig) => {
                const renderableTypes = ["string", "number", "boolean"];
                const values = Object.values(existingConfig.config)
                  .map((v) =>
                    renderableTypes.includes(typeof v) ?
                      String(v)
                    : JSON.stringify(v),
                  )
                  .join(", ");
                return (
                  <Btn
                    key={existingConfig.id}
                    variant="faded"
                    onClick={() => {
                      setConfig(existingConfig.config);
                    }}
                  >
                    {values}
                  </Btn>
                );
              })}
            </FlexRowWrap>
          </FlexCol>
        )}
      </FlexCol>
    </Popup>
  );
};

export type MCPServerConfigContext = {
  setServerToConfigure: (
    p: Omit<MCPServerConfigProps, "onDone" | "dbs">,
  ) => Promise<void | MCPServerEnabledConfig>;
};

export const MCPServerConfigContext = React.createContext<
  MCPServerConfigContext | undefined
>(undefined);

export const MCPServerConfigProvider = ({
  children,
  dbs,
}: {
  children: React.ReactNode;
  dbs: DBS;
}) => {
  const [serverToConfigure, setServerToConfigure] =
    useState<MCPServerConfigProps>();

  const value = React.useMemo(() => {
    return {
      setServerToConfigure: async (
        props: Omit<MCPServerConfigProps, "onDone" | "dbs">,
      ) => {
        return new Promise<MCPServerEnabledConfig | void>((resolve) => {
          setServerToConfigure({
            ...props,
            dbs,
            onDone: (enabled) => {
              resolve(enabled);
            },
          });
        });
      },
    };
  }, [dbs]);

  return (
    <MCPServerConfigContext.Provider value={value}>
      {children}
      {serverToConfigure && (
        <MCPServerConfig
          {...serverToConfigure}
          onDone={(enabled) => {
            serverToConfigure.onDone(enabled);
            setServerToConfigure(undefined);
          }}
        />
      )}
    </MCPServerConfigContext.Provider>
  );
};

export const useMCPServerConfig = () => {
  const context = useContext(MCPServerConfigContext);
  if (!context) {
    throw new Error(
      "useMCPServerConfig must be used within a MCPServerConfigProvider",
    );
  }
  return context;
};
