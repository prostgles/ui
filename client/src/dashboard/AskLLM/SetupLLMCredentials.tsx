import React from "react"
import type { Prgl } from "../../App"
import SmartForm from "../SmartForm/SmartForm"
import { FlexCol, FlexRowWrap } from "../../components/Flex"
import Btn from "../../components/Btn"
import Popup from "../../components/Popup/Popup"
import type { DbsByUserType } from "../Dashboard/DBS"
import { mdiKey, mdiLogin } from "@mdi/js"
import Loading from "../../components/Loading"
import FormField from "../../components/FormField/FormField"
import { POST } from "../../pages/Login"

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
  const { state } = setupState;
  const [email, setEmail] = React.useState(setupState.globalSettings?.data?.prostglesRegistration?.email || "");

  const content = state === "loading"? <Loading delay={1000} /> : 
    state === "cannotSetupOrNotAllowed"? 
    <div>
      Contact the admin to setup the AI assistant
    </div> :
    <FlexCol data-command="SetupLLMCredentials">
      <FlexCol>
        <div className="my-2 font-18 bold">
          To to use the AI assistant you need to either: 
        </div>
        <FlexRowWrap>
          <Btn variant="filled" color="action" onClick={() => setSetupType("free")} iconPath={mdiLogin}>
            Use for free by signing up
          </Btn>
          <strong>
            Or
          </strong>
          <Btn variant="faded" color="action" onClick={() => setSetupType("free")} iconPath={mdiKey}>
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
              { prostglesRegistration: { email, token, enabled: true } }
            );
          }}
        >
          Register
        </Btn>
      </FlexCol> }
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
  const defaultCredential = credentials?.find(c => c.is_default);

  /** Order by Id to ensure the first prompt is the default chat */
  const { data: prompts } = dbs.llm_prompts.useSubscribe({}, { orderBy: { id: 1 } });
  const firstPromptId = prompts?.[0]?.id;
  
  if(isAdmin){
    if(!globalSettings?.data){
      return {
        state: "loading" as const
      }
    }
    const { data: { prostglesRegistration } } = globalSettings;

    if(!prostglesRegistration || !defaultCredential || !credentials || !prompts){
      return {
        state: "mustSetup" as const,
        globalSettings,
      }
    }

    const { enabled, email, token } = prostglesRegistration;
    if(enabled){
      // const quota = await POST("/api/llm/quota", { token });
      console.error("Finish this")
    }
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