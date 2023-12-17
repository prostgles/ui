import { mdiAlert, mdiCodeBraces, mdiLanguageTypescript } from "@mdi/js";
import React from "react";
import Btn from "../../../components/Btn";
import { FlexCol, FlexRow } from "../../../components/Flex";
import { FormFieldDebounced } from "../../../components/FormField/FormFieldDebounced";
import { InfoRow } from "../../../components/InfoRow";
import PopupMenu from "../../../components/PopupMenu"; 
import { download } from "../../ProstglesSQL/W_SQL";
import { APICodeExamples } from "./APICodeExamples";
import { APIDetailsProps } from "./APIDetails";
import { usePromise, useSubscribeOne } from "prostgles-client/dist/react-hooks";


export const APIDetailsWs = ({ dbs, dbsMethods, connectionId, token, projectPath }: APIDetailsProps & { token: string }) => {

  const serverSettings = useSubscribeOne(dbs.global_settings.subscribeOneHook({}));
  const dbSchemaTypes = usePromise(async () => {
    if(dbsMethods.getAPITSDefinitions && connectionId){
      const dbSchemaTypes = await dbsMethods.getConnectionDBTypes?.(connectionId)
      return dbSchemaTypes
    }
  }, [dbsMethods, connectionId]);

  return <FlexCol>
    <h4 className="m-0 p-0">Websocket API (recommended)</h4>
    <div className=" ">Realtime Isomorphic API using <a target="_blank" href="https://github.com/prostgles/prostgles-client-js">
      prostgles-client</a> library. End-to-end type-safety between client & server using the database Typescript schema provided below:
    </div>

    {serverSettings && !serverSettings.allowed_origin && 
      
      <PopupMenu 
        button={<Btn iconPath={mdiAlert} color="warn" variant="faded">Allowed origin not set</Btn>}
        clickCatchStyle={{ opacity: .2 }}
        contentStyle={{ maxWidth: "500px" }}
        render={() => <FlexCol>
          <InfoRow className="ws-pre">
            Allowed origin specifies which domains can access the this app in a cross-origin manner. 
            Sets the Access-Control-Allow-Origin header. 
            Use '*' or a specific URL to allow API access
          </InfoRow>
          <p>For testing it is recommended to use "*" as the allowed origin value</p>
          <FormFieldDebounced 
            label={"Allowed origin"}
            value={serverSettings.allowed_origin}
            onChange={allowed_origin => {
              dbs.global_settings.update({}, { allowed_origin });
            }}
          />
        </FlexCol>}
      />
    }
    <FlexRow className="ai-end mb-1 ">
      <PopupMenu 
        title="Examples"
        button={<Btn variant="filled" iconPath={mdiCodeBraces} color="action">Examples</Btn>}
        onClickClose={false}
        positioning="center"
        contentStyle={{ width: "700px", maxWidth: "100%" }}
        clickCatchStyle={{ opacity: .6 }}
        content={
          <APICodeExamples token={token} projectPath={projectPath} dbSchemaTypes={dbSchemaTypes} />
        }
      />
      <Btn title="Download typescript schema"
        disabledInfo={dbsMethods.getConnectionDBTypes? undefined : "Not permitted"}
        onClick={() => {
          download(dbSchemaTypes, "DBoGenerated.d.ts", "text/plain")
        }}
        iconPath={mdiLanguageTypescript}
        variant="faded"
        color="action"
      >
        Database schema types
      </Btn>
    </FlexRow>
  </FlexCol>
}