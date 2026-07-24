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
import type { LLMSetupState } from "./LLMSetupProvider";
import Tabs from "@components/Tabs";

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
        <FlexCol className="ai-center  ">
          <div className={"font-18   mb-1"}>
            The AI assistant requires access to an LLM provider
          </div>
          <Tabs
            activeKey={setupType}
            onChange={setSetupType}
            contentClass="pt-2"
            items={{
              free: {
                label: "Signup (free)",
                leftIconPath: mdiLogin,
                listProps: { "data-command": "SetupLLMCredentials.free" },
                content: <ProstglesSignup setupState={setupState} />,
              },
              api: {
                label: "Add provider",
                leftIconPath: mdiKey,
                listProps: { "data-command": "SetupLLMCredentials.api" },
                content: <LLMProviderSetup />,
              },
            }}
          />
        </FlexCol>
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
