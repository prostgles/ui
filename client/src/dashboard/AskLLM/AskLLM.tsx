
import { mdiAssistant, mdiPlus, mdiScript } from "@mdi/js";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { Chat } from "../../components/Chat/Chat";
import { FlexCol, FlexRow } from "../../components/Flex";
import Popup from "../../components/Popup/Popup";
import Select from "../../components/Select/Select";
import { renderInterval } from "../W_SQL/customRenderers";
import { LLMChatOptions } from "./LLMChatOptions";
import { SetupLLMCredentials, useAskLLMSetupState } from "./SetupLLMCredentials";
import { useLLMChat } from "./useLLMChat";
import { useLLMSchemaStr } from "./useLLMSchemaStr";

export const CHAT_WIDTH = 800;

type P = Prgl & { workspaceId: string | undefined }
export const AskLLM = (props: P) => {
  const { workspaceId, ...prgl } = props;
  const { dbsMethods, dbs, user } = prgl;
  const { askLLM } = dbsMethods;

  const { schemaStr } = useLLMSchemaStr(prgl);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const onClose = () => {
    setAnchorEl(null);
  }
  const state = useAskLLM(props);
  if(!askLLM) { //  || !firstCredential && user?.type !== "admin"
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
        setupState={state}
        anchorEl={anchorEl} 
        onClose={onClose} 
      /> :
      <Popup
        data-command="AskLLM.popup"
        showFullscreenToggle={{}}
        title={
          <FlexRow>
            <FlexCol className="gap-p25">
              <div>
                Ask AI Assistant
              </div>
              <span className="text-2 font-14">
                (experimental)
              </span>
            </FlexCol>
            <FlexRow className="gap-p25 min-w-0">
              <LLMChatOptions {...prgl} 
                prompts={state.prompts} 
                activeChat={state.activeChat}
                activeChatId={state.activeChatId}
                credentials={state.credentials}
              />
              <Select 
                title={"Chat"}
                fullOptions={state.latestChats?.map(c => ({ 
                  key: c.id, 
                  label: c.name,
                  subLabel: renderInterval(c.created_ago, true, true, true), 
                })) ?? []}
                value={state.activeChatId}
                showSelectedSublabel={true}
                style={{
                  flex:1,
                  minWidth: "80px",
                  maxWidth: "fit-content",
                }}
                onChange={v => {
                  state.setActiveChat(v);
                }}
              />
              <Btn 
                iconPath={mdiPlus}
                title="New chat"
                variant="faded"
                color="action"
                onClickPromise={() => state.createNewChat(state.defaultCredential.id)}
              />
              <Select 
                className="ml-1"
                title="Prompt"
                btnProps={{
                  iconPath: mdiScript
                }}
                fullOptions={state.llm_prompts?.map(p => ({ key: p.id, label: p.name, subLabel: p.description || undefined })) ?? []}
                value={state.activeChat?.llm_prompt_id}
                onChange={promptId => {
                  dbs.llm_chats.update({ id: state.activeChatId }, { llm_prompt_id: promptId });
                }}
              />
            </FlexRow>
          </FlexRow>
        }
        positioning="beneath-left"
        clickCatchStyle={{ opacity: 1 }}
        onClickClose={false}
        // showFullscreenToggle={{}}
        onClose={onClose}
        anchorEl={anchorEl}
        contentClassName="p-0 f-1"
        rootStyle={{
          flex: 1,
        }}
        rootChildStyle={{
          flex: 1,
        }}
      > 
        <FlexCol
          className="min-h-0 f-1"
          style={{
            whiteSpace: "pre-line",
            maxWidth: `${CHAT_WIDTH}px`,
          }}
        >
          <Chat 
            style={{
              minWidth: `min(${CHAT_WIDTH}px, 100%)`,
              minHeight: "0"
            }}
            messages={state.messages}
            disabledInfo={state.activeChat?.disabled_message ?? undefined}
            onSend={async (msg) => {
              if(!msg || !state.activeChatId) return;
              await askLLM(msg, schemaStr, state.activeChatId).catch(error => {
                const errorText = error?.message || error;
                alert(typeof errorText === "string"? errorText : JSON.stringify(errorText));
              });
            }}
          />
        </FlexCol>
    </Popup>}
  </> 
}

const useAskLLM = (props: P) => {
  const { workspaceId, ...prgl } = props;
  const state = useAskLLMSetupState(prgl);
  const chatState = useLLMChat({ ...prgl, workspaceId, credentials: "credentials" in state? state.credentials : undefined });

  return state.state === "ready"? {
    ...state,
    ...chatState,
  } : state;
}