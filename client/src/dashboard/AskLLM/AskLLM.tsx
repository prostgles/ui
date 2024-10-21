
import { mdiAssistant, mdiPlus, mdiScript } from "@mdi/js";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import type { Message } from "../../components/Chat/Chat";
import { Chat } from "../../components/Chat/Chat";
import { Marked } from "../../components/Chat/Marked";
import { FlexCol, FlexRow } from "../../components/Flex";
import Loading from "../../components/Loading";
import Popup from "../../components/Popup/Popup";
import Select from "../../components/Select/Select";
import SmartForm from "../SmartForm/SmartForm";
import { renderInterval } from "../W_SQL/customRenderers";
import { LLMChatOptions } from "./LLMChatOptions";
import { loadGeneratedWorkspaces } from "./loadGeneratedWorkspaces";
import { useLLMChat } from "./useLLMChat";
import { useLLMSchemaStr } from "./useLLMSchemaStr";
import { isObject } from "../../../../commonTypes/publishUtils";

export const CHAT_WIDTH = 800;

export const AskLLM = (prgl: Prgl) => {
  const { dbsMethods, dbs, user } = prgl;
  const { askLLM } = dbsMethods;

  const { 
    llmMessages, createNewChat, activeChatId, latestChats, 
    setActiveChat, firstCredential, prompts, activeChat, credentials
  } = useLLMChat(prgl);
  
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
                loadGeneratedWorkspaces(json.prostglesWorkspaces, prgl).catch(error => {
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

  const messages: Message[] = actualMessages.length? actualMessages : [
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
  if(!askLLM) return null;

  return <>
    <Btn 
      title="Ask AI"
      variant="faded"
      color="action"
      iconPath={mdiAssistant}
      onClick={(e) => {
        setAnchorEl(e.currentTarget);
      }}
    >
      {window.isMediumWidthScreen? null : `Ask AI`}
    </Btn>
    {anchorEl && !firstCredential && <Popup
      title="Setup AI assistant"
      positioning="beneath-left"
      anchorEl={anchorEl}
      onClose={onClose}
      clickCatchStyle={{ opacity: 1 }}
    >
      <div className="my-2 font-18 bold">
        Add a credential to use AI assistant.
      </div>
      <SmartForm 
        label=""
        theme={prgl.theme}
        methods={{}}
        className="p-0"
        db={prgl.dbs as any}
        tables={prgl.dbsTables} 
        tableName="llm_credentials"
        columnFilter={c => !["created"].includes(c.name)}
        showJoinedTables={false}
        hideChangesOptions={true}
        jsonbSchemaWithControls={true}
      />
    </Popup>}
    {anchorEl && firstCredential && 
      <Popup
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
            onSend={async (msg) => {
              if(!msg || !activeChatId) return;
              await askLLM(msg, schemaStr, activeChatId);
            }}
          />
        </FlexCol>
    </Popup>}
  </> 
}
