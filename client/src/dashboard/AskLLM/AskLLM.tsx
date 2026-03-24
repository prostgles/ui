import Btn from "@components/Btn";
import { ErrorTrap } from "@components/ErrorComponent";
import { mdiAssistant } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useMemo, useState } from "react";
import { t } from "../../i18n/i18nUtils";
import type { LoadedSuggestions } from "../Dashboard/dashboardUtils";
import { AskLLMChat } from "./Chat/AskLLMChat";
import { useLLMSetup } from "./Setup/LLMSetupProvider";
import { SetupLLMCredentials } from "./Setup/SetupLLMCredentials";
import { AskLLMToolApprover } from "./Tools/AskLLMToolApprover";

type AskLLMProps = {
  workspaceId: string | undefined;
  loadedSuggestions: LoadedSuggestions | undefined;
};

export const AskLLM = (props: AskLLMProps) => {
  const { workspaceId, loadedSuggestions } = props;
  const { dbsMethods, connectionId } = usePrgl();
  const { askLLM, stopAskLLM } = dbsMethods;

  const [showChat, setShowChat] = useState<{ selectedChatId?: number }>();
  const selectedChat = useMemo(
    () =>
      showChat?.selectedChatId ?
        ({ type: "toolApproval", id: showChat.selectedChatId } as const)
      : undefined,
    [showChat],
  );
  const onClose = () => {
    setShowChat(undefined);
  };
  const state = useLLMSetup();

  return (
    <ErrorTrap>
      <Btn
        title={
          t.AskLLM["Chat to an AI Assistant to get help with your queries"]
        }
        variant="faded"
        color="action"
        iconPath={mdiAssistant}
        data-command="AskLLM"
        onClick={() => {
          setShowChat({});
        }}
        loading={state.state === "loading"}
        disabledInfo={
          !askLLM ?
            t.AskLLM["AI assistant not available. Talk to the admin"]
          : undefined
        }
      >
        {/* {window.isMediumWidthScreen ? null : t.AskLLM["AI Assistant"]} */}
      </Btn>

      {state.state === "ready" && state.toolApprovalState && (
        <AskLLMToolApprover
          loadedSuggestions={loadedSuggestions}
          workspaceId={workspaceId}
          onOpenChat={(selectedChatId) => setShowChat({ selectedChatId })}
          openedChatId={showChat?.selectedChatId}
          connectionId={connectionId}
          {...state.toolApprovalState}
        />
      )}

      {!showChat || !askLLM || !stopAskLLM ?
        null
      : state.state !== "ready" ?
        <SetupLLMCredentials
          asPopup={true}
          setupState={state}
          onClose={onClose}
        />
      : <AskLLMChat
          loadedSuggestions={loadedSuggestions}
          askLLM={askLLM}
          stopAskLLM={stopAskLLM}
          workspaceId={workspaceId}
          setupState={state}
          onClose={onClose}
          selectedChat={selectedChat}
        />
      }
    </ErrorTrap>
  );
};
