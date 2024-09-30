
import { mdiAssistant, mdiPlus } from "@mdi/js";
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
import { useLLMChat } from "./useLLMChat";
import { useLLMSchemaStr } from "./useLLMSchemaStr";
import SmartForm from "../SmartForm/SmartForm"; 
import { InfoRow } from "../../components/InfoRow";
import { LLMChatOptions } from "./LLMChatOptions";


export const AskLLM = (prgl: Prgl) => {
  const { dbsMethods, dbs, user } = prgl;
  const { askLLM } = dbsMethods;

  const { 
    llmMessages, createNewChat, activeChatId, latestChats, 
    setActiveChat, firstCredential, prompts, activeChat, credentials
  } = useLLMChat(prgl);
  
  const actualMessages: Message[] = llmMessages?.map(m => ({
    incoming: m.user_id !== user?.id,
    message: <Marked content={m.message || ""} /> ,
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
      <InfoRow variant="naked" className="mt-1">
        No credentials found. Please add a credential to use AI assistant.
      </InfoRow>
      <SmartForm 
        label="Add LLM Credential"
        theme={prgl.theme}
        methods={{}}
        className="p-0"
        db={prgl.dbs as any}
        tables={prgl.dbsTables} 
        tableName="llm_credentials"
        columnFilter={c => !["created"].includes(c.name)}
        showJoinedTables={false}
        hideChangesOptions={true}
      />
    </Popup>}
    {anchorEl && firstCredential && 
      <Popup
        title={
          <FlexRow>
            <div>
              Ask AI Assistant <span className="text-2 font-14">(experimental)</span>
            </div>
            <Select 
              title={"Chat"}
              fullOptions={latestChats?.map(c => ({ key: c.id, label: c.name })) ?? []}
              value={activeChatId}
              showSelectedSublabel={true}
              style={{
                backgroundColor: "transparent",
              }}
              onChange={v => {
                setActiveChat(v);
              }}
            />
            <LLMChatOptions {...prgl} 
              prompts={prompts} 
              activeChat={activeChat}
              activeChatId={activeChatId}
              credentials={credentials}
            />
            <Btn 
              iconPath={mdiPlus}
              title="New chat"
              variant="faded"
              color="action"
              onClickPromise={() => createNewChat(firstCredential.id)}
            />
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
            maxWidth: "700px",
          }}
        >
          <Chat 
            style={{
              minWidth: "min(600px, 100%)",
              minHeight: "0"
            }}
            messages={messages}
            onSend={async (msg) => {
              if(!msg || !activeChatId) return;
              // const newMessages = [...messages, { message: msg, incoming: false, sent: new Date(), sender_id: "me" }];
              // setMessages(newMessages);
              await dbs.llm_messages.insert({
                user_id: user?.id as any,
                chat_id: activeChatId,
                message: msg,
              });
              const response = await askLLM(msg, schemaStr, activeChatId);
              // if(!getIsMounted()) return;
              // const aiResponseText = response.choices[0]?.message.content;
              // console.log(aiResponseText);

              // const newMessagesWithAiResponse = [...newMessages, { message: <Marked content={aiResponseText} />, incoming: true, sent: new Date(), sender_id: "ai" }];
              // setMessages(newMessagesWithAiResponse);
            }}
          />
        </FlexCol>
    </Popup>}
  </> 
}
