import { mdiCogOutline } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useMemo, useState } from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import type { Prgl } from "../../../App";
import Btn from "../../../components/Btn";
import { FlexCol } from "../../../components/Flex";
import Popup from "../../../components/Popup/Popup";
import { t } from "../../../i18n/i18nUtils";
import { SmartForm, type SmartFormProps } from "../../SmartForm/SmartForm";

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

export const AskLLMChatOptions = (props: LLMChatOptionsProps) => {
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
        maximum_consecutive_tool_fails: 1,
        extra_body: 1,
        extra_headers: 1,
        created: 1,
        id: 1,
      } as const satisfies Partial<Record<keyof DBSSchema["llm_chats"], 1>>,
      methods: {},
      rowFilter: [{ fieldName: "id", value: activeChatId }],
      jsonbSchemaWithControls: {
        // noLabels: true,
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
        data-command="LLMChatOptions.toggle"
      />
      {anchorEl && (
        <Popup
          contentStyle={{ padding: 0, maxWidth: "min(100vw, 700px)" }}
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
