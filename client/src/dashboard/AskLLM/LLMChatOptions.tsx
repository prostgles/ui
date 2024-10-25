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
  const { dbs, activeChatId, dbsTables } = prgl; 

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