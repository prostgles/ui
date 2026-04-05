import { FlexCol } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import { TabsWithDefaultStyle, type TabItem } from "@components/Tabs";
import {
  mdiAccountKey,
  mdiAssistant,
  mdiCloudKeyOutline,
  mdiDocker,
  mdiLaptop,
  mdiSecurity,
} from "@mdi/js";
import React from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { Prgl } from "../../App";
import { LLMProviderSetup } from "../../dashboard/AskLLM/Setup/LLMProviderSetup";
import { SmartCardList } from "../../dashboard/SmartCardList/SmartCardList";
import { t } from "../../i18n/i18nUtils";
import { AuthProviderSetup } from "./AuthProvidersSetup/AuthProvidersSetup";
import { MCPServers } from "./MCPServers/MCPServers";
import { SecuritySettings } from "./SecuritySettings";
import { Services } from "./Services";
import type { SERVER_SETTINGS_SECTIONS } from "@common/utils";
import ErrorComponent from "@components/ErrorComponent";

export type ServerSettingsProps = Pick<Prgl, "serverState">;
export const ServerSettings = ({ serverState }: ServerSettingsProps) => {
  const { dbsMethodSchema, dbs, dbsSql, dbsTables } = usePrglCore();

  const { data: stateConnection, isLoading } = dbs.connections.useFindOne({
    is_state_db: true,
  });

  if (isLoading) return <Loading />;
  if (!stateConnection) {
    return (
      <ErrorComponent
        error={
          "State connection not found. Might not have sufficient permissions"
        }
      />
    );
  }

  return (
    <div className="ServerSettings w-full o-auto">
      <div
        className="flex-row jc-center p-p5"
        style={{
          alignSelf: "stretch",
          paddingBottom: "4em",
        }}
      >
        <div
          className="flex-col gap-1 mt-2 max-w-800 min-w-0 f-1"
          style={{ alignSelf: "stretch" }}
        >
          <TabsWithDefaultStyle
            items={
              {
                security: {
                  hide: serverState.isElectron,
                  label: t.ServerSettings["Security"],
                  leftIconPath: mdiSecurity,
                  content: (
                    <SecuritySettings
                      connectionId={undefined}
                      className="p-1 pt-0"
                    />
                  ),
                },
                auth: {
                  hide: serverState.isElectron,
                  leftIconPath: mdiAccountKey,
                  label: t.ServerSettings.Authentication,
                  content: (
                    <AuthProviderSetup connectionId={stateConnection.id} />
                  ),
                },
                cloud: {
                  hide: serverState.isElectron,
                  leftIconPath: mdiCloudKeyOutline,
                  label: t.ServerSettings["Cloud credentials"],
                  content: (
                    <FlexCol className="p-1">
                      {" "}
                      <InfoRow variant="naked" color="info" iconPath="">
                        Configure AWS S3 cloud credentials for file storage
                      </InfoRow>
                      <SmartCardList
                        sql={dbsSql}
                        db={dbs}
                        methods={dbsMethodSchema}
                        tableName="credentials"
                        tables={dbsTables}
                        realtime={true}
                        excludeNulls={true}
                        noDataComponentMode="hide-all"
                        noDataComponent={
                          <InfoRow color="info" className="m-1 h-fit">
                            {
                              t.ServerSettings[
                                "No cloud credentials. Credentials can be added for file storage"
                              ]
                            }
                          </InfoRow>
                        }
                      />
                    </FlexCol>
                  ),
                },
                mcpServers: {
                  leftIconPath: mdiLaptop,
                  label: "MCP Servers",
                  content: <MCPServers chatId={undefined} />,
                },
                llmProviders: {
                  leftIconPath: mdiAssistant,
                  label: "LLM Providers",
                  content: (
                    <FlexCol className="p-1 pt-0 min-w-0">
                      <InfoRow variant="naked" color="info" iconPath="">
                        Configure LLM provider credentials used in AI Assistant
                        chat.
                      </InfoRow>
                      <LLMProviderSetup />
                    </FlexCol>
                  ),
                },
                services: {
                  leftIconPath: mdiDocker,
                  label: "Services",
                  content: (
                    <FlexCol className="p-1 pt-0 min-w-0">
                      <InfoRow variant="naked" color="info" iconPath="">
                        Configure services used by AI Assistant.
                      </InfoRow>
                      <Services showSpecificService={undefined} />
                    </FlexCol>
                  ),
                },
              } satisfies Record<
                (typeof SERVER_SETTINGS_SECTIONS)[number],
                TabItem
              >
            }
          />
        </div>
      </div>
    </div>
  );
};
