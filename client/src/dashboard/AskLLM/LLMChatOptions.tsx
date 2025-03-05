import { mdiCogOutline } from "@mdi/js";
import React, { useState } from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol } from "../../components/Flex";
import Popup from "../../components/Popup/Popup";
import SmartForm from "../SmartForm/SmartForm";

export type LLMChatOptionsProps = Pick<Prgl, "dbs" | "dbsTables" | "theme"> & {
  prompts: DBSSchema["llm_prompts"][] | undefined;
  activeChat: DBSSchema["llm_chats"] | undefined;
  credentials: DBSSchema["llm_credentials"][] | undefined;
  activeChatId: number | undefined;
  chatRootDiv: HTMLDivElement;
};
export const LLMChatOptions = (props: LLMChatOptionsProps) => {
  const { chatRootDiv, dbs, activeChatId, dbsTables } = props;
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement>();
  return (
    <>
      <Btn
        title="Chat settings"
        size="large"
        variant="icon"
        iconProps={{
          size: 1.25,
          path: mdiCogOutline,
        }}
        iconPath={mdiCogOutline}
        onClick={() => setAnchorEl(anchorEl ? undefined : chatRootDiv)}
      />
      {anchorEl && (
        <Popup
          contentStyle={{ padding: 0 }}
          onClickClose={false}
          onClose={() => setAnchorEl(undefined)}
          anchorEl={chatRootDiv}
          positioning="left"
          clickCatchStyle={{ opacity: 1 }}
          title="Chat settings"
          content={
            <FlexCol>
              <SmartForm
                {...props}
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
                // showJoinedTables={false}
              />
            </FlexCol>
          }
        />
      )}
    </>
  );
};
