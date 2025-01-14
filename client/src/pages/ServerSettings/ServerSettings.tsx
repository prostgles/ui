import {
  mdiAccountKey,
  mdiCloudKeyOutline,
  mdiLaptop,
  mdiSecurity,
} from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React, { useState } from "react";
import { getCIDRRangesQuery } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import Chip from "../../components/Chip";
import { FlexCol } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { InfoRow } from "../../components/InfoRow";
import { TabsWithDefaultStyle } from "../../components/Tabs";
import SmartCardList from "../../dashboard/SmartCard/SmartCardList";
import SmartForm from "../../dashboard/SmartForm/SmartForm";
import { AuthProviderSetup } from "./AuthProvidersSetup";
import type { DBGeneratedSchema } from "../../../../commonTypes/DBGeneratedSchema";
import { t } from "../../i18n/i18nUtils";

export const ServerSettings = ({
  theme,
  dbsMethods,
  dbs,
  dbsTables,
}: Pick<Prgl, "dbsMethods" | "dbs" | "dbsTables" | "auth" | "theme">) => {
  const [testCIDR, setCIDR] = useState<{ cidr?: string }>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const myIP = usePromise(() => dbsMethods.getMyIP!());

  const ipRanges = usePromise(async () => {
    try {
      const cidr = testCIDR.cidr;
      const ranges =
        !cidr ? undefined : (
          ((await dbs.sql!(
            getCIDRRangesQuery({ cidr, returns: ["from", "to"] }),
            { cidr },
            { returnType: "row" },
          )) ?? ({} as any))
        );

      return {
        ...(ranges as { from?: string; to?: string }),
        error: undefined,
      };
    } catch (error: any) {
      return { error, to: undefined, from: undefined };
    }
  }, [testCIDR, dbs.sql]);

  if (!myIP) return null;

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
            items={{
              security: {
                label: t.ServerSettings["Security"],
                leftIconPath: mdiSecurity,
                content: (
                  <FlexCol style={{ opacity: settingsLoaded ? 1 : 0 }}>
                    <SmartForm
                      theme={theme}
                      className="bg-color-0 shadow "
                      label=""
                      db={dbs as any}
                      methods={dbsMethods}
                      tableName="global_settings"
                      columns={
                        {
                          allowed_origin: 1,
                          allowed_ips: 1,
                          allowed_ips_enabled: 1,
                          trust_proxy: 1,
                          session_max_age_days: 1,
                          login_rate_limit: 1,
                          login_rate_limit_enabled: 1,
                        } satisfies Partial<
                          Record<
                            keyof DBGeneratedSchema["global_settings"]["columns"],
                            1
                          >
                        >
                      }
                      tables={dbsTables}
                      rowFilter={[{} as any]}
                      hideChangesOptions={true}
                      showLocalChanges={false}
                      confirmUpdates={true}
                      hideNonUpdateableColumns={true}
                      onLoaded={() => setSettingsLoaded(true)}
                    />
                    <FlexCol className="p-1 bg-color-0 shadow ">
                      <FormField
                        label={t.ServerSettings["Validate a CIDR"]}
                        value={testCIDR.cidr ?? ""}
                        onChange={(cidr) => {
                          setCIDR({ cidr });
                        }}
                        placeholder="127.1.1.1/32"
                        asColumn={true}
                        hint={
                          t.ServerSettings[
                            "Enter a value to see the allowed IP ranges"
                          ]
                        }
                        error={ipRanges?.error}
                        rightIcons={
                          <Btn
                            title={t.ServerSettings["Add your current IP"]}
                            iconPath={mdiLaptop}
                            onClick={() => setCIDR({ cidr: myIP.ip + "/128" })}
                          ></Btn>
                        }
                      />
                      {/* {myIP && <InfoRow className="" color="info" variant="naked">
                    <div className="flex-col ai-center w-fit">
                      <div> Your current IP Address:</div> 
                      <strong>{myIP?.ip}</strong>
                    </div>
                  </InfoRow>} */}
                      {!!ipRanges?.from && (
                        <FlexCol>
                          {ipRanges.from === ipRanges.to ?
                            <Chip
                              variant="naked"
                              label={t.ServerSettings["Allowed IP"]}
                              value={ipRanges.from}
                            />
                          : <>
                              <Chip
                                variant="naked"
                                label={t.ServerSettings["From IP"]}
                                value={ipRanges.from}
                              />
                              <Chip
                                variant="naked"
                                label={t.ServerSettings["To IP"]}
                                value={ipRanges.to}
                              />
                            </>
                          }
                        </FlexCol>
                      )}
                    </FlexCol>
                  </FlexCol>
                ),
              },
              auth: {
                leftIconPath: mdiAccountKey,
                label: t.ServerSettings.Authentication,
                content: <AuthProviderSetup dbs={dbs} dbsTables={dbsTables} />,
              },
              cloud: {
                leftIconPath: mdiCloudKeyOutline,
                label: t.ServerSettings["Cloud credentials"],
                content: (
                  <SmartCardList
                    theme={theme}
                    db={dbs as any}
                    methods={dbsMethods}
                    tableName="credentials"
                    tables={dbsTables}
                    filter={{}}
                    realtime={true}
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
                ),
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};
