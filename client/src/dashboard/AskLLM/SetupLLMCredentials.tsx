import { mdiKey, mdiLogin } from "@mdi/js"
import React from "react"
import type { Prgl } from "../../App"
import Btn from "../../components/Btn"
import { FlexCol, FlexRowWrap } from "../../components/Flex"
import FormField from "../../components/FormField/FormField"
import Loading from "../../components/Loading"
import Popup from "../../components/Popup/Popup"
import type { DbsByUserType } from "../Dashboard/DBS"
import { AddLLMCredentialForm } from "./AddLLMCredentialForm"
import SmartCardList from "../SmartCard/SmartCardList"
import { SwitchToggle } from "../../components/SwitchToggle"
import { InfoRow } from "../../components/InfoRow"

type P = Pick<Prgl, "theme" | "dbs" | "dbsTables" | "dbsMethods"> & {
  setupState: Exclude<LLMSetupState, { state: "ready" }>;
} & ({
  asPopup: true;
  onClose: VoidFunction;
} | {
  asPopup?: false;
  onClose?: undefined;
})
export const SetupLLMCredentials = ({ theme, dbs, dbsTables, dbsMethods, asPopup, onClose, setupState }: P) => {

  const [setupType, setSetupType] = React.useState<"free" | "api">();
  const { state, credentials } = setupState;
  const [email, setEmail] = React.useState(setupState.globalSettings?.data?.prostgles_registration?.email || "");
  const [selectedCredentialIds, setSelectedCredentialIds] = React.useState<number[]>([]);

  const content = state === "loading"? <Loading delay={1000} /> : 
    state === "cannotSetupOrNotAllowed"? 
    <div>
      Contact the admin to setup the AI assistant
    </div> :
    <FlexCol data-command="SetupLLMCredentials">
      <FlexCol className="ai-center mb-2" >
        {!setupType && <div className={"font-18 bold my-2"}>
          To to use the AI assistant you need to either: 
        </div>}
        <FlexRowWrap>
          <Btn 
            data-command="SetupLLMCredentials.free"
            variant={setupType === "free"? "filled" : "faded"} 
            color="action" 
            onClick={() => setSetupType("free")} 
            iconPath={mdiLogin}
          >
            Use for free by signing up
          </Btn>
          <strong>
            Or
          </strong>
          <Btn 
            data-command="SetupLLMCredentials.api"
            variant={setupType === "api"? "filled" : "faded"} 
            color="action" 
            onClick={() => setSetupType("api")} 
            iconPath={mdiKey}
          >
            Provide API Keys
          </Btn>
        </FlexRowWrap>
      </FlexCol>
      {setupType === "free" && <FlexCol>
        <div>
          Provide an email address to get started 
        </div>
        <FormField 
          id="email" 
          type="email" 
          label="Email"
          value={email} 
          required={true}
          onChange={email => {
            setEmail(email);
          }} 
        />
        <Btn 
          variant="filled" 
          color="action" 
          onClickPromise={async () => {
            const { token, error, hasError } = await dbsMethods.prostglesSignup!(email);
            if(hasError){
              throw error;
            }
            await dbs.global_settings.update(
              {}, 
              { prostgles_registration: { email, token, enabled: true } }
            );
          }}
        >
          Register
        </Btn>
      </FlexCol> }
      {setupType === "api" && <>
        <SmartCardList
          title="Select allowed credentials"
          className="mb-1"
          db={dbs as any}
          tableName={"llm_credentials"}
          methods={dbsMethods}
          tables={dbsTables}
          theme={theme}
          showEdit={false}
          noDataComponent={<InfoRow color="info" variant="filled">No existing credentials</InfoRow>}
          fieldConfigs={[
            {
              name: "name",
            }, {
              name: "config",
              renderValue: (v) => {
                return v.Provider;
              }
            },
            {
              name: "id",
              className: "ml-auto",
              render: (id) => {
                return <SwitchToggle 
                  checked={selectedCredentialIds.includes(id)} 
                  onChange={v => {
                    if(v){
                      setSelectedCredentialIds([...selectedCredentialIds, id]);
                    } else {
                      setSelectedCredentialIds(selectedCredentialIds.filter(i => i !== id));
                    }
                  }}
                />
              }
            }
          ]}
        />
        <AddLLMCredentialForm dbs={dbs} />      
      </>}
    </FlexCol>
  
  if(!asPopup){
    return content;
  }
  return <Popup
    title="Setup AI assistant"
    positioning="top-center"
    data-command="AskLLM.popup"
    onClose={onClose}
    clickCatchStyle={{ opacity: 1 }}
  >
    {content}
  </Popup>
}

type LLMSetupState = ReturnType<typeof useAskLLMSetupState>;
export type LLMSetupStateReady = Extract<LLMSetupState, { state: "ready" }>;
export const useAskLLMSetupState = (props: Pick<Prgl, "dbs" | "user">) => {
  const dbs = props.dbs as DbsByUserType;
  const { user } = props;
  const isAdmin = user?.type === "admin";
  const { data: credentials } = dbs.llm_credentials.useSubscribe();
  const globalSettings = dbs.global_settings?.useSubscribeOne?.();
  /** For backward compatibility pick last credential as default */
  const defaultCredential = credentials?.find(c => c.is_default) ?? credentials?.at(-1);

  /** Order by Id to ensure the first prompt is the default chat */
  const { data: prompts } = dbs.llm_prompts.useSubscribe({}, { orderBy: { id: 1 } });
  const firstPromptId = prompts?.[0]?.id;
  
  if(isAdmin){
    if(!globalSettings?.data){
      return {
        state: "loading" as const
      }
    }

    if(!defaultCredential || !credentials || !prompts){
      return {
        state: "mustSetup" as const,
        globalSettings,
      }
    }

    // const { data: { prostgles_registration } } = globalSettings;
    // const { enabled, email, token } = prostgles_registration;
    // if(enabled){
    //   // const quota = await POST("/api/llm/quota", { token });
    //   console.error("Finish this")
    // }
  } else if(!defaultCredential || !credentials || !prompts){
    return {
      state: "cannotSetupOrNotAllowed" as const
    }
  }

  return {
    state: "ready" as const,
    defaultCredential,
    globalSettings,
    credentials,
    prompts,
    firstPromptId,
  }
}