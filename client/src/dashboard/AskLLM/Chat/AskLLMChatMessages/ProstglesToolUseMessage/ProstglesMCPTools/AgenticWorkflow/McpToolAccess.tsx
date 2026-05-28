import { isObject, type DBSSchema } from "@common/publishUtils";
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
import { MCPServerConfig } from "@pages/ServerSettings/MCPServers/MCPServerConfig/MCPServerConfig";
import { getMcpConfigValueAsString } from "@pages/ServerSettings/MCPServers/MCPServerConfig/MCPServerConfigButton";
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
    configData: Record<string, string> | undefined;
  }>();
  const { dbs } = usePrglCore();
  const {
    data: allConfigData,
    isLoading,
    error,
  } = dbs.mcp_server_configs.useSubscribe({}, {});
  if (isLoading || !allConfigData) return <Loading />;
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
          const configData =
            !config_schema || !configId ?
              undefined
            : allConfigData.find((c) => c.id === configId)?.config;
          const configDataString =
            configData ? getMcpConfigValueAsString(configData) : undefined;
          return (
            <FlexRowWrap
              key={mcpServerName}
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
              {config_schema && (
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
                    })
                  }
                >
                  {configDataString || "Configure"}
                </Btn>
              )}
            </FlexRowWrap>
          );
        })}
      </ScrollFade>
      {editServerConfig && (
        <MCPServerConfig
          serverName={editServerConfig.serverName}
          chatId={undefined}
          existingConfig={
            editServerConfig.configId && editServerConfig.configData ?
              {
                id: editServerConfig.configId,
                value: editServerConfig.configData,
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
