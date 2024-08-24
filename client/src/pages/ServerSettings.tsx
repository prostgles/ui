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

  return <div className="ServerSettings w-full o-auto" style={{ opacity: settingsLoaded? 1 : 0 }}>
    <div className="flex-row jc-center p-p5" style={{ alignSelf: "stretch" }}>
      <div className="flex-col gap-1 mt-2 max-w-800 min-w-0 f-1" style={{ alignSelf: "stretch" }}>
        <SmartForm 
          theme={theme}
          className="bg-color-0 shadow "
          label="Network security"
          db={dbs as any}
          methods={dbsMethods}
          tableName="global_settings" 
          tables={dbsTables}
          rowFilter={[{} as any]} 
          hideChangesOptions={true}
          showLocalChanges={false}
          confirmUpdates={true}
          hideNonUpdateableColumns={true} 
          onLoaded={() => setSettingsLoaded(true)}
        />

        <div className="flex-col gap-1 p-1 bg-color-0 shadow "> 
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
          {!!ipRanges?.from && <div className="flex-col gap-1">
            {ipRanges.from === ipRanges.to? <Chip variant="naked" label="Allowed IP" value={ipRanges.from} /> : <>
              <Chip variant="naked" label="From IP" value={ipRanges.from} />
              <Chip variant="naked" label="To IP" value={ipRanges.to} />
            </> }
          </div>}

        </div>
          
        <div className="shadow bg-color-0 p-1" >
          <h4 className="font-20 mt-p25">Cloud credentials</h4>
          {/* <SmartTable db={dbs as any} tableName="credentials" tables={dbsTables}  />
          <CredentialSelector dbs={dbs} dbsTables={dbsTables} onChange={console.log} /> */}

          <SmartCardList
            theme={theme}
            db={dbs as any} 
            methods={dbsMethods}
            tableName="credentials" 
            tables={dbsTables}
            filter={{}}
            realtime={true}
            noDataComponentMode="hide-all"
            noDataComponent={<InfoRow color="info">No cloud credentials. Credentials can be added for file storage</InfoRow>}
          />
        </div>
      </div>
    </div>
  </div>
}