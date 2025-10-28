import { mdiAssistant } from "@mdi/js";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import Btn from "@components/Btn";
import { t } from "../../i18n/i18nUtils";
import type { LoadedSuggestions } from "../Dashboard/dashboardUtils";
import { AskLLMChat } from "./Chat/AskLLMChat";
import { SetupLLMCredentials } from "./Setup/SetupLLMCredentials";
import { useLLMSetupState } from "./Setup/useLLMSetupState";

export const CHAT_WIDTH = 800;

type P = Prgl & {
  workspaceId: string | undefined;
  loadedSuggestions: LoadedSuggestions | undefined;
};

export const AskLLM = (props: P) => {
  const { workspaceId, loadedSuggestions, ...prgl } = props;
  const { dbsMethods } = prgl;
  const { askLLM, callMCPServerTool } = dbsMethods;

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const onClose = () => {
    setAnchorEl(null);
  };
  const state = useLLMSetupState(prgl);

  return (
    <>
      <Btn
        title={
          t.AskLLM["Chat to an AI Assistant to get help with your queries"]
        }
        variant="faded"
        color="action"
        iconPath={mdiAssistant}
        data-command="AskLLM"
        onClick={(e) => {
          setAnchorEl(e.currentTarget);
        }}
        loading={state.state === "loading"}
        disabledInfo={
          !askLLM ?
            t.AskLLM["AI assistant not available. Talk to the admin"]
          : undefined
        }
      >
        {window.isMediumWidthScreen ? null : t.AskLLM["AI Assistant"]}
      </Btn>

      {!anchorEl || !askLLM ?
        null
      : state.state !== "ready" ?
        <SetupLLMCredentials
          {...prgl}
          asPopup={true}
          setupState={state}
          onClose={onClose}
        />
      : <AskLLMChat
          loadedSuggestions={loadedSuggestions}
          prgl={prgl}
          callMCPServerTool={callMCPServerTool}
          askLLM={askLLM}
          workspaceId={workspaceId}
          setupState={state}
          anchorEl={anchorEl}
          onClose={onClose}
        />
      }
    </>
  );
};
