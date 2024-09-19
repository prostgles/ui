
import { mdiAssistant } from "@mdi/js";
import React, { useState } from "react";
import type { Prgl } from "../App";
import Btn from "../components/Btn";
import type { Message } from "../components/Chat/Chat";
import { Chat } from "../components/Chat/Chat";
import { FlexCol } from "../components/Flex";
import PopupMenu from "../components/PopupMenu";
import { useIsMounted } from "./Backup/CredentialSelector";
import { useMemoDeep } from "prostgles-client/dist/prostgles";
import { Marked } from "../components/Chat/Marked";


export const AskLLM = ({ dbsMethods, tables }: Pick<Prgl, "dbsMethods" | "tables">) => {
  const getIsMounted = useIsMounted();
  const { askLLM } = dbsMethods;
  const [messages, setMessages] = useState<Message[]>([]);

  const schemaStr = useMemoDeep(() => {
    const res = tables.map(t => {
      return `CREATE TABLE ${t.name} (\n${
        t.columns.map(c => `  ${c.name} ${c.udt_name} ${c.is_pkey? "PRIMARY KEY" : c.is_nullable? "" : "NOT NULL"} ${(!c.is_pkey && c.has_default)? `DEFAULT ${c.column_default}` : ""} ${c.references? c.references.map(r => `REFERENCES ${r.ftable} (${r.fcols})`) : ""}`).join(",\n ")
      }\n)`
    }).join(";\n");

    return res;
  }, [tables]);

  if(!askLLM) return null;

  return <PopupMenu 
      title="Ask AI Assistant"
      positioning="beneath-left"
      clickCatchStyle={{ opacity: 1 }}
      onClickClose={false}
      showFullscreenToggle={{}}
      onClose={() => {
      }}
      contentClassName="p-0"
      button={(
        <Btn 
          title="Ask AI"
          variant="faded"
          iconPath={mdiAssistant}
        >
          {window.isMediumWidthScreen? null : `Ask AI`}
        </Btn>
      )}
      footerButtons={(pClose => [
        {
          label: "Cancel",
          variant: "outline",
          onClick: (e) => {  
            pClose?.(e)
          }
        }, 
      ])}
    > 
      <FlexCol
        style={{
          whiteSpace: "pre-line"
        }}
      >
        <Chat 
          messages={messages}
          onSend={async (msg) => {
            if(!msg) return;
            const newMessages = [...messages, { message: msg, incoming: false, sent: new Date(), sender_id: "me" }];
            setMessages(newMessages);
            const response = await askLLM(msg, schemaStr);
            if(!getIsMounted()) return;
            const aiResponseText = response.choices[0]?.message.content;
            console.log(aiResponseText);
            const newMessagesWithAiResponse = [...newMessages, { message: <Marked content={aiResponseText} />, incoming: true, sent: new Date(), sender_id: "ai" }];
            setMessages(newMessagesWithAiResponse);
          }}
        />
      </FlexCol>
  </PopupMenu>
}
