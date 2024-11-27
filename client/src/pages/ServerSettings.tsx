import { mdiLaptop } from "@mdi/js";
import React, { useState } from "react";
import { getCIDRRangesQuery } from "../../../commonTypes/publishUtils";
import Btn from "../components/Btn";
import Chip from "../components/Chip";
import FormField from "../components/FormField/FormField";
import { InfoRow } from "../components/InfoRow"; 
import SmartCardList from "../dashboard/SmartCard/SmartCardList";
import SmartForm from "../dashboard/SmartForm/SmartForm";
import { usePromise } from "prostgles-client/dist/react-hooks";
import type { Prgl } from "../App";
import { TabsWithDefaultStyle } from "../components/Tabs";
import { DBS } from "../dashboard/Dashboard/DBS";
import { DBSchemaGenerated } from "../../../commonTypes/DBoGenerated";
import { FlexCol } from "../components/Flex";

export const ServerSettings = ({ theme, dbsMethods, dbs, dbsTables }: Pick<Prgl, "dbsMethods" | "dbs" | "dbsTables" | "auth" | "theme">) => {

  const [testCIDR, setCIDR] = useState<{ cidr?: string }>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const myIP = usePromise(() => dbsMethods.getMyIP!()); 

  const ipRanges = usePromise(async () => {

    try {
      const cidr = testCIDR.cidr;
      const ranges = !cidr? undefined : await dbs.sql!(getCIDRRangesQuery({ cidr, returns: ["from", "to"] }), { cidr }, { returnType: "row" }) ?? {} as any;

      return { ...(ranges as { from?: string; to?: string;}), error: undefined };
    
    } catch(error: any){
      return { error, to: undefined, from: undefined };
    }

  }, [testCIDR, dbs.sql]);

  if(!myIP) return null;

  return <div className="ServerSettings w-full o-auto" 
    
  >
    <div className="flex-row jc-center p-p5" style={{ alignSelf: "stretch" }}>
      <div className="flex-col gap-1 mt-2 max-w-800 min-w-0 f-1" style={{ alignSelf: "stretch" }}>
        <TabsWithDefaultStyle
          items={{
            security: {
              label: "Security",
              content: <FlexCol style={{ opacity: settingsLoaded? 1 : 0 }}>
                <SmartForm 
                  theme={theme}
                  className="bg-color-0 shadow "
                  label=""
                  db={dbs as any}
                  methods={dbsMethods}
                  tableName="global_settings" 
                  columns={{ allowed_origin: 1, allowed_ips: 1, allowed_ips_enabled: 1, trust_proxy: 1, session_max_age_days: 1, login_rate_limit: 1, login_rate_limit_enabled: 1  }} //  satisfies DBSchemaGenerated["global_settings"]["columns"]
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
                    label="Validate a CIDR" 
                    value={testCIDR.cidr ?? ""} 
                    onChange={cidr => { setCIDR({ cidr }) }}
                    placeholder="127.1.1.1/32"
                    asColumn={true} 
                    hint={"Enter a value to see the allowed IP ranges"}
                    error={ipRanges?.error}
                    rightIcons={<Btn title="Add your current IP" iconPath={mdiLaptop} onClick={() =>  setCIDR({ cidr: myIP.ip + "/128" })}></Btn>}
                  />
                  {/* {myIP && <InfoRow className="" color="info" variant="naked">
                    <div className="flex-col ai-center w-fit">
                      <div> Your current IP Address:</div> 
                      <strong>{myIP?.ip}</strong>
                    </div>
                  </InfoRow>} */}
                  {!!ipRanges?.from && <FlexCol>
                    {ipRanges.from === ipRanges.to? <Chip variant="naked" label="Allowed IP" value={ipRanges.from} /> : <>
                      <Chip variant="naked" label="From IP" value={ipRanges.from} />
                      <Chip variant="naked" label="To IP" value={ipRanges.to} />
                    </> }
                  </FlexCol>}
                </FlexCol>
              </FlexCol>
            },
            auth: {
              label: "Authentication",
              content: <FlexCol style={{ opacity: settingsLoaded? 1 : 0 }}>
                <SmartForm 
                  theme={theme}
                  className="bg-color-0 shadow "
                  label=""
                  db={dbs as any}
                  methods={dbsMethods}
                  tableName="global_settings" 
                  columns={{ auth_providers: 1 }} //  satisfies DBSchemaGenerated["global_settings"]["columns"]
                  tables={dbsTables}
                  rowFilter={[{} as any]} 
                  hideChangesOptions={true}
                  showLocalChanges={false}
                  confirmUpdates={true}
                  hideNonUpdateableColumns={true} 
                  onLoaded={() => setSettingsLoaded(true)}
                />
                </FlexCol>
            },
            cloud: {
              label: "Cloud credentials",
              content: <SmartCardList
                theme={theme}
                db={dbs as any} 
                methods={dbsMethods}
                tableName="credentials" 
                tables={dbsTables}
                filter={{}}
                realtime={true}
                noDataComponentMode="hide-all"
                noDataComponent={<InfoRow color="info" className="m-1">No cloud credentials. Credentials can be added for file storage</InfoRow>}
              />
            }
          }}
        />
      </div>
    </div>
  </div>
}