import Btn from "@components/Btn";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import Loading from "@components/Loader/Loading";
import Popup from "@components/Popup/Popup";
import { mdiKey, mdiLogin } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import { isPlaywrightTest } from "../../../i18n/i18nUtils";
import { AddLLMPromptForm } from "./AddLLMPromptForm";
import { LLMProviderSetup } from "./LLMProviderSetup";
import { ProstglesSignup } from "./ProstglesSignup";
import type { LLMSetupState } from "./useLLMSetupState";

export type SetupLLMCredentialsProps = {
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
  const { dbs, dbsTables, dbsSql } = usePrgl();
  const { asPopup, onClose, setupState } = props;
  const [setupType, setSetupType] = React.useState<"free" | "api" | undefined>(
    isPlaywrightTest ? undefined : "api",
  );
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
              // disabledInfo={isPlaywrightTest ? undefined : "Coming soon"}
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
        {setupType === "free" && <ProstglesSignup setupState={setupState} />}
        {setupType === "api" && <LLMProviderSetup />}
        {setupType && !prompts.length && (
          <FlexCol className="mt-2">
            <InfoRow color="info" variant="filled">
              No existing prompts
            </InfoRow>
            <AddLLMPromptForm dbsSql={dbsSql} dbs={dbs} dbsTables={dbsTables} />
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
