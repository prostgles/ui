import React from "react"
import type { Prgl } from "../../App"
import SmartForm from "../SmartForm/SmartForm"
import { FlexCol, FlexRowWrap } from "../../components/Flex"
import Btn from "../../components/Btn"
import Popup from "../../components/Popup/Popup"
import type { DbsByUserType } from "../Dashboard/DBS"

type P = Pick<Prgl, "theme" | "dbs" | "dbsTables"> & {
  anchorEl: HTMLElement | null;
  onClose: VoidFunction;
  setupState: Exclude<SetupState, { state: "ready" }>;
}
export const SetupLLMCredentials = ({ theme, dbs, dbsTables, anchorEl, onClose, setupState }: P) => {

  const [setupType, setSetupType] = React.useState<"free" | "api">();
  
  const { state } = setupState;
  if(state !== "mustSetup" && state !== "loading"){
    return null;
  }
  if(!anchorEl) return null;
  
  return <Popup
    title="Setup AI assistant"
    positioning="beneath-left"
    data-command="AskLLM.popup"
    anchorEl={anchorEl}
    onClose={onClose}
    clickCatchStyle={{ opacity: 1 }}
  >
    {state === "cannotSetupOrNotAllowed"? 
      <div>
        Contact the admin to setup the AI assistant
      </div> :
      <FlexCol data-command="SetupLLMCredentials">
        <FlexCol>
          <div className="my-2 font-18 bold">
            To to use the AI assistant you need to either: 
          </div>
          <FlexRowWrap>
            <Btn variant="filled" color="action" onClick={() => setSetupType("free")}>
              Use for free by signing up
            </Btn>
            <Btn variant="faded" color="action" onClick={() => setSetupType("free")}>
              Use your own API Keys
            </Btn>
          </FlexRowWrap>
        </FlexCol>
        {setupType === "api" && <SmartForm 
          label=""
          theme={theme}
          methods={{}}
          className="p-0"
          db={dbs as any}
          tables={dbsTables} 
          tableName="llm_credentials"
          columnFilter={c => !["created"].includes(c.name)}
          showJoinedTables={false}
          hideChangesOptions={true}
          jsonbSchemaWithControls={true}
        />}
      </FlexCol>
    }
  </Popup>
}

type SetupState = ReturnType<typeof useAskLLMSetupState>;
export const useAskLLMSetupState = (props: Pick<Prgl, "dbs" | "user">) => {
  const dbs = props.dbs as DbsByUserType;
  const { user } = props;
  const isAdmin = user?.type === "admin";
  const { data: credentials } = dbs.llm_credentials.useSubscribe();
  const globalSettings = dbs.global_settings?.useSubscribeOne?.();
  const defaultCredential = credentials?.find(c => c.is_default);

  if(isAdmin){
    if(!globalSettings?.data){
      return {
        state: "loading" as const
      }
    }
    const { data: { prostglesRegistration } } = globalSettings;

    if(!prostglesRegistration || !defaultCredential){
      return {
        state: "mustSetup" as const
      }
    }
  } else if(!defaultCredential){
    return {
      state: "cannotSetupOrNotAllowed" as const
    }
  }

  return {
    state: "ready" as const,
    defaultCredential,
    credentials,
  }
}