import { mdiCogOutline } from "@mdi/js"
import { useEffectDeep } from "prostgles-client/dist/prostgles"
import React from "react"
import type { DBSSchema } from "../../../../commonTypes/publishUtils"
import type { Prgl } from "../../App"
import Btn from "../../components/Btn"
import { FlexCol } from "../../components/Flex"
import PopupMenu from "../../components/PopupMenu"
import SmartForm from "../SmartForm/SmartForm"

type P = Prgl & {
  prompts: DBSSchema["llm_prompts"][] | undefined;
  activeChat: DBSSchema["llm_chats"] | undefined;
  credentials: DBSSchema["llm_credentials"][] | undefined;
  activeChatId: number | undefined;
}
export const LLMChatOptions = (prgl: P) => {
  const { dbs, prompts, activeChatId, dbsTables } = prgl;
  const propmtCount = prompts?.length;
  useEffectDeep(() => {
    if(propmtCount === 0){
      (async () => {
        const prompt = await dbs.llm_prompts.findOne();
        if(prompt){
          return
        }
        dbs.llm_prompts.insert({ 
          name: "Chat", 
          description: "Basic chat",
          user_id: undefined as any,
          prompt: [
            "You are an assistant for a PostgreSQL based software called Prostgles Desktop.",
            "Assist user with any queries they might have. Do not add empty lines in your sql response.",
            "Reply with a full and concise answer that does not require further clarification or revisions.",
            "Below is the database schema they're currently working with:",
            "",
            "${schema}"
          ].join("\n") 
        });
        dbs.llm_prompts.insert({
          name: "Dashboards", 
          description: "Create dashboards. Claude Sonnet recommended",
          user_id: undefined as any,
          prompt: [
            "You are an assistant for a PostgreSQL based software called Prostgles Desktop.",
            "Assist user with any queries they might have.",
            "Below is the database schema they're currently working with:",
            "",
            "${schema}",
            "",
            "Using dashboard structure below create workspaces with useful views my current schema.",
            "Return only a valid json of this format: { prostglesWorkspaces: WorkspaceInsertModel[] }",
            "",
            "${dashboardTypes}"
          ].join("\n") 
        });
      })()
    }
  }, [propmtCount, dbs.llm_prompts]);

  return <PopupMenu 
    button={
      <Btn 
        title="Chat settings"
        iconPath={mdiCogOutline}
      />
    }
    contentStyle={{ padding: 0 }}
    onClickClose={false}
    title="Chat settings"
    content={
      <FlexCol>
        <SmartForm
          {...prgl}
          label=""
          contentClassname="p-1 pt-1"
          columns={{
            name: 1,
            llm_credential_id: 1,
            llm_prompt_id: 1,
            created: 1,
          }}
          jsonbSchemaWithControls={true}
          db={dbs as any}
          tables={dbsTables}
          methods={{}}
          tableName="llm_chats"
          rowFilter={[{ fieldName: "id", value: activeChatId }]}
          hideChangesOptions={true}
          showJoinedTables={false}
        />
      </FlexCol>
    }
  />
}