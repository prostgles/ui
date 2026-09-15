import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { FileTree } from "@components/FileTree/FileTree";
import { FlexCol, FlexRow } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import Popup from "@components/Popup/Popup";
import { mdiDeleteOutline } from "@mdi/js";
import { isEqual } from "prostgles-types";
import React, { useCallback } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { McpServerOAuthConfig } from "./CustomConfigComponents/McpServerOAuthConfig";
import { WebMcpConfig } from "./CustomConfigComponents/WebMcpConfig";
import { getMcpConfigAsStrings } from "./MCPServerConfigButton";
import { useMCPServerConfigState } from "./useMCPServerConfigState";

export type MCPServerEnabledConfig = { configId: number };

export type MCPServerConfigProps = {
  serverName: string;
  existingConfig:
    | Pick<DBSSchema["mcp_server_configs"], "id" | "config" | "oauth">
    | undefined;
  defaultConfig: undefined | DBSSchema["mcp_server_configs"]["config"];
  chatId: number | undefined;
  onDone: (res: void | MCPServerEnabledConfig) => void;
};

export const MCPServerConfigEditor = (props: MCPServerConfigProps) => {
  const { serverName, existingConfig: initialExistingConfig, onDone } = props;
  const {
    upsertConfig,
    canSave,
    schema,
    setConfig,
    config: configValue,
    existingConfigs,
    server,
  } = useMCPServerConfigState(props);

  const setLocalConfig = useCallback(
    (newConfig: Record<string, unknown>) => {
      setConfig({
        type: "local",
        value: newConfig,
      });
    },
    [setConfig],
  );
  const existingConfig =
    initialExistingConfig ??
    existingConfigs.find((c) => isEqual(c.config, configValue));
  const { dbs } = usePrglCore();
  const otherConfigs = existingConfigs.filter(
    (c) => !existingConfig || c.id !== existingConfig.id,
  );
  if (!server) {
    return null;
  }

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
      contentClassName="p-1"
      footerButtons={[
        {
          label: "Cancel",
          onClick: () => onDone(),
        },
        existingConfig && {
          label: "Delete config",
          className: "ml-auto",
          variant: "faded",
          color: "danger",
          onClickPromise: async () => {
            await dbs.mcp_server_configs.delete({
              id: existingConfig.id,
            });
            onDone();
          },
        },
        {
          label: existingConfig ? "Update" : "Enable",
          "data-command": "MCPServerConfig.save",
          disabledInfo:
            !existingConfig && server.command === "streamable-http" ?
              "Must complete OAuth flow"
            : canSave ? undefined
            : "No changes",
          variant: "filled",
          color: "action",
          className: existingConfig ? undefined : "ml-auto",
          onClickPromise: upsertConfig,
        },
      ]}
    >
      <FlexCol className="min-h-0">
        {server.command === "streamable-http" ?
          <McpServerOAuthConfig
            server={server}
            existingConfig={existingConfig}
            setConfig={setConfig}
            onDone={onDone}
          />
        : Object.entries(schema ?? {}).map(([key, schema]) => {
            const config =
              configValue?.type === "local" ? configValue.value : {};
            if (schema.renderWithComponent === "FileTree") {
              const currentValue = config[key];
              return (
                <FileTree
                  key={key}
                  mode="pick-multiple"
                  type="all"
                  value={currentValue as string[] | undefined}
                  onChange={(newValue) => {
                    setLocalConfig({
                      ...config,
                      [key]: newValue,
                    });
                  }}
                />
              );
            }

            if (schema.renderWithComponent === "WebMcpConfig") {
              return (
                <WebMcpConfig
                  key={key}
                  value={config[key]}
                  onChange={(newValue) => {
                    setLocalConfig({
                      ...config,
                      [key]: newValue,
                    });
                  }}
                />
              );
            }

            return (
              <FormField
                type="text"
                key={key}
                label={schema.title ?? key}
                hint={schema.description}
                value={config[key] as string | undefined}
                onChange={(v) =>
                  setLocalConfig({
                    ...config,
                    [key]: v,
                  })
                }
              />
            );
          })
        }
        {Boolean(otherConfigs.length) && (
          <FlexCol className="py-1 pb-2 gap-p5 bt b-color ">
            <div className="ta-start mb-1 bold">Existing configurations:</div>
            <FlexCol>
              {otherConfigs.map(({ id, config }) => {
                const values = getMcpConfigAsStrings(config, schema ?? null);
                return (
                  <FlexRow key={id} className="gap-0">
                    <Btn
                      variant="faded"
                      size="small"
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                      onClick={() => {
                        setConfig(config);
                      }}
                    >
                      {values
                        .map(({ displayValue }) => displayValue)
                        .join(", ")}
                    </Btn>
                    <Btn
                      size="small"
                      iconPath={mdiDeleteOutline}
                      title="Delete existing config (if not used in other chats)"
                      onClickPromise={async () => {
                        await dbs.mcp_server_configs.delete({
                          id,
                        });
                      }}
                    />
                  </FlexRow>
                );
              })}
            </FlexCol>
          </FlexCol>
        )}
      </FlexCol>
    </Popup>
  );
};
