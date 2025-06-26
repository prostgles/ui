import { mdiCheck, mdiCircleOutline } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useMemo } from "react";
import { dashboardTypes } from "../../../../../commonTypes/DashboardTypes";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import Btn from "../../../components/Btn";
import { FlexCol } from "../../../components/Flex";
import { MonacoEditor } from "../../../components/MonacoEditor/MonacoEditor";
import PopupMenu from "../../../components/PopupMenu";
import Tabs from "../../../components/Tabs";
import { CodeEditorWithSaveButton } from "../../CodeEditor/CodeEditorWithSaveButton";
import { SmartCardList } from "../../SmartCardList/SmartCardList";
import type { AskLLMChatProps } from "../AskLLMChat";
import { btnStyleProps } from "./AskLLMChatActionBar";

export const AskLLMChatActionBarPromptSelector = (
  props: Pick<AskLLMChatProps, "prgl" | "setupState"> & {
    activeChat: DBSSchema["llm_chats"];
    dbSchemaForPrompt: string;
  },
) => {
  const { prgl, setupState, activeChat, dbSchemaForPrompt } = props;
  const activeChatId = activeChat.id;
  const { prompts } = setupState;
  const { dbs } = prgl;
  const prompt = useMemo(
    () => prompts.find(({ id }) => id === activeChat.llm_prompt_id),
    [prompts, activeChat.llm_prompt_id],
  );
  const promptContent = useMemo(() => {
    if (!prompt) return "";
    return prompt.prompt
      .replaceAll("${schema}", dbSchemaForPrompt)
      .replaceAll("${dashboardTypes}", dashboardTypes);
  }, [dbSchemaForPrompt, prompt]);
  return (
    <PopupMenu
      title="Prompt settings"
      positioning="above-center"
      data-command="LLMChatOptions.Prompt"
      showFullscreenToggle={{}}
      clickCatchStyle={{ opacity: 1 }}
      onClickClose={false}
      contentClassName="p-2 flex-col gap-1"
      button={
        <Btn title="Prompt" {...btnStyleProps}>
          {prompt?.name}
        </Btn>
      }
    >
      <SmartCardList
        style={{
          maxWidth: "min(600px, 100vw)",
        }}
        showTopBar={{ insert: true }}
        fieldConfigs={[
          {
            name: "name",
            renderMode: "full",
            render: (name, { id, description }) => {
              const isActive = activeChat.llm_prompt_id === id;
              return (
                <Btn
                  className={"p-0 text-0 ta-start"}
                  style={{ padding: 0 }}
                  variant="text"
                  iconPath={isActive ? mdiCheck : mdiCircleOutline}
                  iconStyle={isActive ? { opacity: 1 } : { opacity: 0 }}
                  onClick={async () => {
                    if (!activeChatId) return;
                    dbs.llm_chats.update(
                      { id: activeChatId },
                      {
                        llm_prompt_id: id,
                      },
                    );
                  }}
                >
                  <FlexCol className="gap-p25">
                    <div style={{ fontWeight: "bold" }}>{name}</div>
                    <div style={{ fontWeight: "normal" }}>{description}</div>
                  </FlexCol>
                </Btn>
              );
            },
          },
          {
            name: "id",
            hide: true,
          },
          {
            name: "description",
            hide: true,
          },
        ]}
        tableName={"llm_prompts"}
        db={dbs as DBHandlerClient}
        methods={prgl.dbsMethods}
        tables={prgl.dbsTables}
      />
      {prompt && (
        <Tabs
          defaultActiveKey="editable"
          contentClass="py-1"
          items={{
            editable: {
              label: "Edit prompt",
              content: (
                <CodeEditorWithSaveButton
                  key={prompt.id}
                  value={prompt.prompt}
                  label=""
                  language={"text"}
                  onSave={async (v) => {
                    await dbs.llm_prompts.update(
                      { id: prompt.id },
                      {
                        prompt: v,
                      },
                    );
                  }}
                />
              ),
            },
            preview: {
              label: "Preview",
              iconPath: mdiCircleOutline,
              content: (
                <MonacoEditor
                  value={promptContent}
                  language="text"
                  loadedSuggestions={undefined}
                />
              ),
            },
          }}
        />
      )}
    </PopupMenu>
  );
};
