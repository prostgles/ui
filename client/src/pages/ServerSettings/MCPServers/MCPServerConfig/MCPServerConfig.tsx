import Btn from "@components/Btn";
import { FileTree } from "@components/FileTree/FileTree";
import { FlexCol, FlexRow } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import Popup from "@components/Popup/Popup";
import { mdiDeleteOutline } from "@mdi/js";
import React, { useContext, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import { useMCPServerConfigState } from "./useMCPServerConfigState";

export type MCPServerEnabledConfig = { configId: number };

export type MCPServerConfigProps = {
  serverName: string;
  existingConfig:
    | { id: number; value: Record<string, string | string[]> }
    | undefined;
  chatId: number | undefined;
  onDone: (res: void | MCPServerEnabledConfig) => void;
};

export const MCPServerConfig = (props: MCPServerConfigProps) => {
  const { serverName, existingConfig, onDone } = props;
  const { upsertConfig, canSave, schema, setConfig, config, existingConfigs } =
    useMCPServerConfigState(props);
  const { dbs } = usePrglCore();
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
      contentClassName="p-1"
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
          onClickPromise: upsertConfig,
        },
      ]}
    >
      <FlexCol className="min-h-0">
        {Object.entries(schema).map(([key, schema]) => {
          if (schema.renderWithComponent === "FileTree") {
            const currentValue = config[key];
            return (
              <FileTree
                key={key}
                mode="pick-multiple"
                type="all"
                value={currentValue as string[] | undefined}
                onChange={(newValue) => {
                  setConfig({
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
                setConfig({
                  ...config,
                  [key]: v,
                })
              }
            />
          );
        })}
        {Boolean(existingConfigs.length) && (
          <FlexCol className="p-1 pb-2 gap-p5 bt b-color ml-p5">
            <div className="ta-start mb-1">Existing configurations:</div>
            <FlexCol>
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
                  <FlexRow key={existingConfig.id} className="gap-0">
                    <Btn
                      variant="faded"
                      size="small"
                      onClick={() => {
                        setConfig(existingConfig.config);
                      }}
                    >
                      {values}
                    </Btn>
                    <Btn
                      size="small"
                      iconPath={mdiDeleteOutline}
                      title="Delete existing config (if not used in other chats)"
                      onClickPromise={async () => {
                        await dbs.mcp_server_configs.delete({
                          id: existingConfig.id,
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
}: {
  children: React.ReactNode;
}) => {
  const [serverToConfigure, setServerToConfigure] =
    useState<MCPServerConfigProps>();

  const value = React.useMemo(() => {
    return {
      setServerToConfigure: async (
        props: Omit<MCPServerConfigProps, "onDone">,
      ) => {
        return new Promise<MCPServerEnabledConfig | void>((resolve) => {
          setServerToConfigure({
            ...props,
            onDone: (enabled) => {
              resolve(enabled);
            },
          });
        });
      },
    };
  }, []);

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
