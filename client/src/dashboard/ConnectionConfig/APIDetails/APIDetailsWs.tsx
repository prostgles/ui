import { mdiAlert, mdiCodeBraces, mdiLanguageTypescript } from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React from "react";
import Btn from "../../../components/Btn";
import { FlexCol, FlexRow } from "../../../components/Flex";
import FormField from "../../../components/FormField/FormField";
import { InfoRow } from "../../../components/InfoRow";
import PopupMenu from "../../../components/PopupMenu";
import { download } from "../../W_SQL/W_SQL";
import { APICodeExamples } from "./APICodeExamples";
import type { APIDetailsProps } from "./APIDetails";


const AllowedOriginCheck = ({ dbs }: Pick<APIDetailsProps, "dbs">) => {
  const { data: serverSettings } = dbs.global_settings.useSubscribeOne({});
  const [allowed_origin, setAllowedOrigin] = React.useState(serverSettings?.allowed_origin);

  if(serverSettings && !serverSettings.allowed_origin){
    return <PopupMenu 
      button={<Btn iconPath={mdiAlert} color="warn" variant="faded">Allowed origin not set</Btn>}
      clickCatchStyle={{ opacity: .2 }}
      contentStyle={{ maxWidth: "500px" }}
      footerButtons={pClose => [
        { label: "Close", onClick: pClose },
        { 
          label: "Confirm", 
          color: "action", 
          variant: "filled",
          disabledInfo: !allowed_origin? "Allowed origin is required" : undefined, 
          onClickPromise: () => {
            return dbs.global_settings.update({}, { allowed_origin });
          } 
        },
      ]}
      render={() => <FlexCol>
        <InfoRow className="ws-pre">
          Allowed origin specifies which domains can access this app in a cross-origin manner. 
          Sets the Access-Control-Allow-Origin header. 
          Use '*' or a specific URL to allow API access
        </InfoRow>
        <p className="ta-left">For testing it is recommended to use "*" as the allowed origin value</p>
        <FormField
          label={"Allowed origin"}
          value={allowed_origin}
          onChange={setAllowedOrigin}
        />
      </FlexCol>}
    />
  }

  return null;
}

export const APIDetailsWs = ({ dbs, dbsMethods, connectionId, token, projectPath }: APIDetailsProps & { token: string }) => {

  const dbSchemaTypes = usePromise(async () => {
    if(dbsMethods.getAPITSDefinitions && connectionId){
      const dbSchemaTypes = await dbsMethods.getConnectionDBTypes?.(connectionId)
      return dbSchemaTypes
    }
  }, [dbsMethods, connectionId]);


  return <FlexCol>
    <h4 className="m-0 p-0">
      Websocket API (recommended)
    </h4>
    <div className=" ">
      Realtime Isomorphic API using <a target="_blank" href="https://github.com/prostgles/prostgles-client-js">
      prostgles-client</a> library. End-to-end type-safety between client & server using the database Typescript schema provided below:
    </div>

    {!!(dbs as any).global_settings && <AllowedOriginCheck dbs={dbs} />}
    <FlexRow className="ai-end mb-1 ">
      <PopupMenu 
        title="Examples"
        button={<Btn variant="filled" iconPath={mdiCodeBraces} color="action">Examples</Btn>}
        onClickClose={false}
        positioning="center"
        contentStyle={{ width: "700px", maxWidth: "100%" }}
        clickCatchStyle={{ opacity: .6 }}
        content={
          <APICodeExamples token={token} projectPath={projectPath} dbSchemaTypes={dbSchemaTypes?.dbSchema} />
        }
      />
      <Btn title="Download typescript schema"
        disabledInfo={dbsMethods.getConnectionDBTypes? undefined : "Not permitted"}
        onClick={() => {
          download(dbSchemaTypes?.dbSchema, "DBoGenerated.d.ts", "text/plain")
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