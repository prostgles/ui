import { mdiAssistant } from "@mdi/js";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { AskLLMChat } from "./AskLLMChat";
import { SetupLLMCredentials } from "./SetupLLMCredentials";
import { useLLMSetupState } from "./useLLMSetupState";
import Loading from "../../components/Loading";

export const CHAT_WIDTH = 800;

type P = Prgl & { workspaceId: string | undefined };

export const AskLLM = (props: P) => {
  const { workspaceId, ...prgl } = props;
  const { dbsMethods } = prgl;
  const { askLLM, callMCPServerTool } = dbsMethods;

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const onClose = () => {
    setAnchorEl(null);
  };
  const state = useLLMSetupState(prgl);

  if (state.state === "loading") {
    return <Loading />;
  }

  return (
    <>
      <Btn
        title="Chat to an AI Assistant to get help with your queries"
        variant="faded"
        color="action"
        iconPath={mdiAssistant}
        data-command="AskLLM"
        onClick={(e) => {
          setAnchorEl(e.currentTarget);
        }}
        disabledInfo={!askLLM ? "AI assistant not available" : undefined}
      >
        {window.isMediumWidthScreen ? null : `Ask AI`}
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
