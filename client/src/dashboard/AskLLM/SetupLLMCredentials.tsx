import { mdiKey, mdiLogin } from "@mdi/js";
import React from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRowWrap } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { InfoRow } from "../../components/InfoRow";
import Loading from "../../components/Loading";
import Popup from "../../components/Popup/Popup";
import { SwitchToggle } from "../../components/SwitchToggle";
import SmartCardList from "../SmartCard/SmartCardList";
import SmartForm from "../SmartForm/SmartForm";
import { AddLLMCredentialForm } from "./AddLLMCredentialForm";
import type { LLMSetupState } from "./useLLMSetupState";
import { AddLLMPromptForm } from "./AddLLMPromptForm";

type P = Pick<Prgl, "theme" | "dbs" | "dbsTables" | "dbsMethods"> & {
  setupState: Exclude<LLMSetupState, { state: "ready" }>;
} & (
    | {
        asPopup: true;
        onClose: VoidFunction;
      }
    | {
        asPopup?: false;
        onClose?: undefined;
      }
  );
export const SetupLLMCredentials = ({
  theme,
  dbs,
  dbsTables,
  dbsMethods,
  asPopup,
  onClose,
  setupState,
}: P) => {
  const [setupType, setSetupType] = React.useState<"free" | "api">();
  const { state, prompts } = setupState;
  const [email, setEmail] = React.useState(
    setupState.globalSettings?.data?.prostgles_registration?.email || "",
  );
  const content =
    state === "loading" ? <Loading delay={1000} />
    : state === "cannotSetupOrNotAllowed" ?
      <div>Contact the admin to setup the AI assistant</div>
    : <FlexCol data-command="SetupLLMCredentials">
        <FlexCol className="ai-center mb-2">
          {!setupType && (
            <div className={"font-18 bold my-2"}>
              To to use the AI assistant you need to either:
            </div>
          )}
          <FlexRowWrap>
            <Btn
              data-command="SetupLLMCredentials.free"
              variant={setupType === "free" ? "filled" : "faded"}
              color="action"
              onClick={() => setSetupType("free")}
              iconPath={mdiLogin}
            >
              Use for free by signing up
            </Btn>
            <strong>Or</strong>
            <Btn
              data-command="SetupLLMCredentials.api"
              variant={setupType === "api" ? "filled" : "faded"}
              color="action"
              onClick={() => setSetupType("api")}
              iconPath={mdiKey}
            >
              Provide API Keys
            </Btn>
          </FlexRowWrap>
        </FlexCol>
        {setupType === "free" && (
          <FlexCol>
            <div>Provide an email address to get started</div>
            <FormField
              id="email"
              type="email"
              label="Email"
              value={email}
              required={true}
              onChange={(email) => {
                setEmail(email);
              }}
            />
            <Btn
              variant="filled"
              color="action"
              onClickPromise={async () => {
                const { token, error, hasError } =
                  await dbsMethods.prostglesSignup!(email);
                if (hasError) {
                  throw error;
                }
                await dbs.global_settings.update(
                  {},
                  { prostgles_registration: { email, token, enabled: true } },
                );
              }}
            >
              Register
            </Btn>
          </FlexCol>
        )}
        {setupType === "api" && (
          <>
            <SmartCardList
              title="API credentials"
              className="mb-1"
              db={dbs as any}
              tableName={"llm_credentials"}
              methods={dbsMethods}
              tables={dbsTables}
              theme={theme}
              showEdit={false}
              noDataComponent={
                <InfoRow color="info" variant="filled">
                  No existing credentials
                </InfoRow>
              }
              fieldConfigs={[
                {
                  name: "name",
                },
                {
                  name: "config",
                  renderValue: (v) => {
                    return v.Provider;
                  },
                },
              ]}
            />
            <AddLLMCredentialForm dbs={dbs} />
          </>
        )}
        {setupType && !prompts?.length && (
          <FlexCol className="mt-2">
            <InfoRow color="info" variant="filled">
              No existing prompts
            </InfoRow>
            <AddLLMPromptForm theme={theme} dbs={dbs} dbsTables={dbsTables} />
          </FlexCol>
        )}
      </FlexCol>;

  if (!asPopup) {
    return content;
  }
  return (
    <Popup
      title="Setup AI assistant"
      positioning="top-center"
      data-command="AskLLM.popup"
      onClose={onClose}
      clickCatchStyle={{ opacity: 1 }}
    >
      {content}
    </Popup>
  );
};
