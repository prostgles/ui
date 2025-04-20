import { mdiCogOutline, mdiTools } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useMemo, useState } from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol } from "../../components/Flex";
import Popup from "../../components/Popup/Popup";
import PopupMenu from "../../components/PopupMenu";
import { t } from "../../i18n/i18nUtils";
import { MCPServers } from "../../pages/ServerSettings/MCPServers/MCPServers";
import { SmartForm, type SmartFormProps } from "../SmartForm/SmartForm";

export type LLMChatOptionsProps = Pick<
  Prgl,
  "dbs" | "dbsTables" | "dbsMethods"
> & {
  prompts: DBSSchema["llm_prompts"][] | undefined;
  activeChat: DBSSchema["llm_chats"] | undefined;
  credentials: DBSSchema["llm_credentials"][] | undefined;
  activeChatId: number | undefined;
  chatRootDiv: HTMLDivElement;
};

export const LLMChatOptions = (props: LLMChatOptionsProps) => {
  const { chatRootDiv, dbs, activeChatId, dbsTables } = props;
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement>();

  const formProps = useMemo(() => {
    return {
      columns: {
        name: 1,
        llm_prompt_id: 1,
        model: 1,
        db_schema_permissions: 1,
        db_data_permissions: 1,
        extra_body: 1,
        extra_headers: 1,
        created: 1,
        id: 1,
      } as const,
      methods: {},
      rowFilter: [{ fieldName: "id", value: activeChatId }],
      jsonbSchemaWithControls: {
        variant: "no-labels",
      },
    } satisfies Pick<
      SmartFormProps,
      "jsonbSchemaWithControls" | "columns" | "methods" | "rowFilter"
    >;
  }, [activeChatId]);

  return (
    <>
      <Btn
        title={t.AskLLMChatHeader["Chat settings"]}
        variant="icon"
        iconPath={mdiCogOutline}
        onClick={() => setAnchorEl(anchorEl ? undefined : chatRootDiv)}
      />
      {anchorEl && (
        <Popup
          contentStyle={{ padding: 0, maxWidth: "min(100vw, 600px)" }}
          onClickClose={false}
          onClose={() => setAnchorEl(undefined)}
          anchorEl={chatRootDiv}
          positioning="right-panel"
          clickCatchStyle={{ opacity: 1 }}
          title={t.AskLLMChatHeader["Chat settings"]}
          content={
            <FlexCol className="f-1 min-s-0">
              <SmartForm
                label=""
                tableName="llm_chats"
                contentClassname="p-1 pt-1"
                {...formProps}
                db={dbs as DBHandlerClient}
                tables={dbsTables}
              />
            </FlexCol>
          }
        />
      )}
    </>
  );
};
