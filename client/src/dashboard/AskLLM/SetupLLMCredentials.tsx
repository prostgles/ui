import { mdiKey, mdiLogin } from "@mdi/js";
import React from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRowWrap } from "../../components/Flex";
import { InfoRow } from "../../components/InfoRow";
import Loading from "../../components/Loading";
import Popup from "../../components/Popup/Popup";
import SmartCardList from "../SmartCard/SmartCardList";
import { AddLLMCredentialForm } from "./AddLLMCredentialForm";
import { AddLLMPromptForm } from "./AddLLMPromptForm";
import { ProstglesSignup } from "./ProstglesSignup";
import type { LLMSetupState } from "./useLLMSetupState";

export type SetupLLMCredentialsProps = Pick<
  Prgl,
  "theme" | "dbs" | "dbsTables" | "dbsMethods"
> & {
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
export const SetupLLMCredentials = (props: SetupLLMCredentialsProps) => {
  const { theme, dbs, dbsTables, dbsMethods, asPopup, onClose, setupState } =
    props;
  const [setupType, setSetupType] = React.useState<"free" | "api">();
  const { state, prompts } = setupState;
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
              Signup (free)
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
          <ProstglesSignup
            setupState={setupState}
            dbs={dbs}
            dbsMethods={dbsMethods}
          />
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
      contentClassName="p-2"
      onClose={onClose}
      clickCatchStyle={{ opacity: 1 }}
    >
      {content}
    </Popup>
  );
};
