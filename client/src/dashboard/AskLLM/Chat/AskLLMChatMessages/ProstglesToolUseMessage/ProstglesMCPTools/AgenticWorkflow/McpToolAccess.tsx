import { getDefaultMcpConfig } from "@common/mcp/web.mcp.schema";
import { type DBSSchema } from "@common/publishUtils";
import { sliceText } from "@common/utils";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexRow, FlexRowWrap } from "@components/Flex";
import { HeaderSection } from "@components/HeaderSection";
import { Icon } from "@components/Icon/Icon";
import Loading from "@components/Loader/Loading";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { SvgIcon } from "@components/SvgIcon";
import { mdiCogOutline, mdiTools } from "@mdi/js";
import { getMcpConfigAsStrings } from "@pages/ServerSettings/MCPServers/MCPServerConfig/MCPServerConfigButton";
import { MCPServerConfigEditor } from "@pages/ServerSettings/MCPServers/MCPServerConfig/MCPServerConfigEditor";
import { useMcpServerIcons } from "@pages/ServerSettings/MCPServers/MCPServerTools/useMcpServerIcons";
import React, { useState } from "react";
import type { TestSelectors } from "src/Testing";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

type P = {
  title: string;
  value: NonNullable<
    DBSSchema["agentic_workflows"]["definition_data"]["orchestrationTools"]
  >;
  configs: NonNullable<
    DBSSchema["agentic_workflows"]["definition_override"]
  >["orchestratorMcpServerConfigs"];
  onConfigChange: undefined | ((serverName: string, configId: number) => void);
} & TestSelectors;

export const McpToolAccess = ({
  value,
  title,
  configs,
  onConfigChange,
  ...testSelectors
}: P) => {
  const { mcpServers, getIcon } = useMcpServerIcons();
  const [editServerConfig, setEditServerConfig] = useState<{
    serverName: string;
    configId: number | undefined;
    configData: DBSSchema["mcp_server_configs"]["config"] | undefined;
    configOAuth: DBSSchema["mcp_server_configs"]["oauth"];
  }>();
  const { dbs } = usePrglCore();
  const {
    data: existingMcpServerConfigs,
    isLoading,
    error,
  } = dbs.mcp_server_configs.useSubscribe({}, {});
  if (isLoading || !existingMcpServerConfigs) return <Loading />;
  return (
    <HeaderSection
      title={title}
      data-command="McpToolAccess"
      {...testSelectors}
    >
      <ErrorComponent title="Failed to get mcp server configs" error={error} />
      <ScrollFade
        title={title}
        className="flex-col gap-p5 oy-auto py-p25"
        style={{ maxHeight: "100px" }}
      >
        {Object.entries(value).map(([mcpServerName, toolNameObj = {}]) => {
          const icon = getIcon(mcpServerName);
          const toolNames = Object.keys(toolNameObj);
          const server = mcpServers?.find((s) => s.name === mcpServerName);
          const { config_schema } = server ?? {};
          const { configId } = configs?.[mcpServerName] ?? {};
          const isConfigurable =
            Boolean(config_schema) || server?.command === "streamable-http";
          const existingConfig =
            configId === undefined ? undefined : (
              existingMcpServerConfigs.find((config) => config.id === configId)
            );

          const configData =
            existingConfig?.config ??
            (!config_schema ? undefined : getDefaultMcpConfig(config_schema));

          const configOAuth = existingConfig?.oauth ?? null;
          const configDataStrings =
            configData &&
            getMcpConfigAsStrings(configData, config_schema ?? null);

          return (
            <FlexRowWrap
              key={mcpServerName}
              data-key={mcpServerName}
              title={toolNames.join(", ")}
              style={{ display: "inline-flex" }}
              className="gap-p25 max-w-fit"
            >
              <FlexRow className="f-0 w-fit gap-p25">
                {icon ?
                  <SvgIcon icon={icon} className="text-1 f-0" />
                : <Icon path={mdiTools} sizeName="micro" className="text-1" />}
                <strong>{mcpServerName}:</strong>
              </FlexRow>
              <span style={{ fontWeight: "normal" }}>
                {sliceText(toolNames.join(", "), 50)}
              </span>
              {isConfigurable && (
                <Btn
                  size="micro"
                  variant={"faded"}
                  data-command="McpToolAccess.configure"
                  color={configData ? "action" : "danger"}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    maxWidth: "200px",
                  }}
                  iconPath={mdiCogOutline}
                  onClick={() =>
                    setEditServerConfig({
                      serverName: mcpServerName,
                      configId,
                      configData,
                      configOAuth,
                    })
                  }
                >
                  {configDataStrings?.map((d) => d.displayValue).join(" ") ||
                    "Configure"}
                </Btn>
              )}
            </FlexRowWrap>
          );
        })}
      </ScrollFade>
      {editServerConfig && (
        <MCPServerConfigEditor
          serverName={editServerConfig.serverName}
          chatId={undefined}
          defaultConfig={editServerConfig.configData}
          existingConfig={
            editServerConfig.configId && editServerConfig.configData ?
              {
                id: editServerConfig.configId,
                config: editServerConfig.configData,
                oauth: editServerConfig.configOAuth,
              }
            : undefined
          }
          onDone={(newConfig) => {
            if (newConfig) {
              onConfigChange?.(editServerConfig.serverName, newConfig.configId);
            }
            setEditServerConfig(undefined);
          }}
        />
      )}
    </HeaderSection>
  );
};
