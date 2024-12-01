
import { mdiAssistant } from "@mdi/js";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { AskLLMChat } from "./AskLLMChat";
import { SetupLLMCredentials, useAskLLMSetupState } from "./SetupLLMCredentials";

export const CHAT_WIDTH = 800;

type P = Prgl & { workspaceId: string | undefined };

export const AskLLM = (props: P) => {
  const { workspaceId, ...prgl } = props;
  const { dbsMethods } = prgl;
  const { askLLM } = dbsMethods;

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const onClose = () => {
    setAnchorEl(null);
  }
  const state = useAskLLMSetupState(prgl);
  if(!askLLM) {
    return null;
  }

  return <>
    <Btn
      title="Chat to an AI Assistant to get help with your queries"
      variant="faded"
      color="action"
      iconPath={mdiAssistant}
      data-command="AskLLM"
      onClick={(e) => {
        setAnchorEl(e.currentTarget);
      }}
    >
      {window.isMediumWidthScreen? null : `Ask AI`}
    </Btn>

    {!anchorEl? null : state.state !== "ready"?  
      <SetupLLMCredentials 
        {...prgl}
        asPopup={true}
        setupState={state}
        onClose={onClose} 
      /> :
      <AskLLMChat 
        prgl={prgl}
        workspaceId={workspaceId}
        setupState={state}
        anchorEl={anchorEl}
        onClose={onClose}
      />
    }
  </> 
}