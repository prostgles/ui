
import { mdiAssistant, mdiPlus, mdiScript } from "@mdi/js";
import React, { useState } from "react";
import { isObject } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import type { Message } from "../../components/Chat/Chat";
import { Chat } from "../../components/Chat/Chat";
import { Marked } from "../../components/Chat/Marked";
import { FlexCol, FlexRow } from "../../components/Flex";
import Loading from "../../components/Loading";
import Popup from "../../components/Popup/Popup";
import Select from "../../components/Select/Select";
import { renderInterval } from "../W_SQL/customRenderers";
import { useSetNewWorkspace } from "../WorkspaceMenu/WorkspaceMenu";
import { LLMChatOptions } from "./LLMChatOptions";
import { loadGeneratedWorkspaces } from "./loadGeneratedWorkspaces";
import { SetupLLMCredentials } from "./SetupLLMCredentials";
import { useLLMChat } from "./useLLMChat";
import { useLLMSchemaStr } from "./useLLMSchemaStr";

export const CHAT_WIDTH = 800;

export const AskLLM = ({ workspaceId, ...prgl }: Prgl & { workspaceId: string | undefined }) => {
  const { dbsMethods, dbs, user } = prgl;
  const { askLLM } = dbsMethods;

  const { 
    llmMessages, createNewChat, activeChatId, latestChats, 
    setActiveChat, firstCredential, prompts, activeChat, credentials
  } = useLLMChat(prgl);

  const { setWorkspace } = useSetNewWorkspace(workspaceId);
  
  const actualMessages: Message[] = llmMessages?.map(m => ({
    incoming: m.user_id !== user?.id,
    message: <Marked 
      content={m.message || ""} 
      codeHeader={({ language, codeString }) => {
        if(language !== "json") return null;
        try {
          const json = JSON.parse(codeString);
          if(Array.isArray(json.prostglesWorkspaces)){
            return <Btn
              color="action"
              iconPath={mdiPlus}
              variant="faded"
              onClick={() => {
                loadGeneratedWorkspaces(json.prostglesWorkspaces, prgl)
                  .then((insertedWorkspaces) => {
                    const [first] = insertedWorkspaces;
                    if(first){
                      setWorkspace(first);
                    }
                  })
                  .catch(error => {
                    if(isObject(error) && error.code === "23505"){
                      alert(`Workspace with this name already exists. Must delete or rename the clashing workspaces: \n${json.prostglesWorkspaces.map(w => w.name).join(", ")}`);
                    }
                  });
              }}
            >
              Load workspaces
            </Btn>
          }
        } catch(e) {
          console.error(e);
        }
      }}
    /> ,
    sender_id: m.user_id || "ai",
    sent: new Date(m.created || new Date()),
  })) ?? [];

  const messages: Message[] = actualMessages.length? actualMessages.concat(activeChat?.disabled_message? [{
    incoming: true,
    message: activeChat.disabled_message,
    sender_id: "ai",
    sent: new Date(),
  }] : []) : [
    { message: "Hello, I am the AI assistant. How can I help you?", incoming: true, sent: new Date("2024-01-01"), sender_id: "ai" },
  ].map(m => {
    const incoming = m.sender_id !== user?.id;
    return { 
      ...m, 
      incoming,
      message: incoming && !m.message? <Loading /> : m.message 
    }
  });

  const { data: llm_prompts } = dbs.llm_prompts.useSubscribe();

  const { schemaStr } = useLLMSchemaStr(prgl);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const onClose = () => {
    setAnchorEl(null);
  }
  if(!askLLM || !firstCredential && user?.type !== "admin") return null;

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

    {anchorEl && !firstCredential && <Popup
      title="Setup AI assistant"
      positioning="beneath-left"
      data-command="AskLLM.popup"
      anchorEl={anchorEl}
      onClose={onClose}
      clickCatchStyle={{ opacity: 1 }}
    >
      <SetupLLMCredentials {...prgl} />
    </Popup>}
    
    {anchorEl && firstCredential && 
      <Popup
        data-command="AskLLM.popup"
        title={
          <FlexRow>
            <FlexCol className="gap-p25">
              <div>
                Ask AI Assistant 
              </div>
              <span className="text-2 font-14">(experimental)</span>
            </FlexCol>
            <FlexRow className="gap-p25">
              <LLMChatOptions {...prgl} 
                prompts={prompts} 
                activeChat={activeChat}
                activeChatId={activeChatId}
                credentials={credentials}
              />
              <Select 
                title={"Chat"}
                fullOptions={latestChats?.map(c => ({ 
                  key: c.id, 
                  label: c.name,
                  subLabel: renderInterval(c.created_ago, true, true, true), 
                })) ?? []}
                value={activeChatId}
                showSelectedSublabel={true}
                style={{
                  // backgroundColor: "transparent",
                }}
                onChange={v => {
                  setActiveChat(v);
                }}
              />
              <Btn 
                iconPath={mdiPlus}
                title="New chat"
                variant="faded"
                color="action"
                onClickPromise={() => createNewChat(firstCredential.id)}
              />
              <Select 
                className="ml-1"
                title="Prompt"
                btnProps={{
                  iconPath: mdiScript
                }}
                fullOptions={llm_prompts?.map(p => ({ key: p.id, label: p.name, subLabel: p.description || undefined })) ?? []}
                value={activeChat?.llm_prompt_id}
                onChange={promptId => {
                  dbs.llm_chats.update({ id: activeChatId }, { llm_prompt_id: promptId });
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
            messages={messages}
            disabledInfo={activeChat?.disabled_message ?? undefined}
            onSend={async (msg) => {
              if(!msg || !activeChatId) return;
              await askLLM(msg, schemaStr, activeChatId).catch(error => {
                const errorText = error?.message || error;
                alert(typeof errorText === "string"? errorText : JSON.stringify(errorText));
              });
            }}
          />
        </FlexCol>
    </Popup>}
  </> 
}
