import { dashboardTypesContent } from "@common/dashboardTypesContent";
import type { DBSSchema } from "@common/publishUtils";
import { useOnErrorAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import { Marked } from "@components/Chat/Marked";
import { FlexCol } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import {
  mdiCheck,
  mdiCircleOutline,
  mdiFileEyeOutline,
  mdiViewCarousel,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { usePromise, type DBHandlerClient } from "prostgles-client";
import React, { useMemo } from "react";
import type { FieldConfig } from "src/dashboard/SmartCard/SmartCard";
import { CodeEditorWithSaveButton } from "../../CodeEditor/CodeEditorWithSaveButton";
import { SmartCardList } from "../../SmartCardList/SmartCardList";
import type { AskLLMChatProps } from "../Chat/AskLLMChat";
import { setChatPrompt } from "../Chat/AskLLMChatMessages/setChatPrompt";
import { ChatActionBarBtnStyleProps } from "./AskLLMChatActionBar";

export const AskLLMChatActionBarPromptSelector = (
  props: Pick<AskLLMChatProps, "setupState"> & {
    activeChat: DBSSchema["llm_chats"];
    dbSchemaForPrompt: string;
  },
) => {
  const { setupState, activeChat, dbSchemaForPrompt } = props;
  const activeChatId = activeChat.id;
  const { prompts } = setupState;
  const { dbs, dbsMethods, dbsSql, connectionId, dbsTables, dbsMethodSchema } =
    usePrgl();
  const prompt = useMemo(
    () => prompts.find(({ id }) => id === activeChat.llm_prompt_id),
    [prompts, activeChat.llm_prompt_id],
  );

  const promptContent = usePromise(async () => {
    if (!prompt) return "";
    return (
      dbsMethods.getFullPrompt?.({
        prompt: prompt.prompt,
        schema: dbSchemaForPrompt,
        dashboardTypesContent,
        connectionId,
      }) || prompt.prompt
    );
  }, [dbSchemaForPrompt, dbsMethods, prompt, connectionId]);

  const { onErrorAlert } = useOnErrorAlert();

  return (
    <PopupMenu
      title="Prompt Selector"
      positioning="above-center"
      data-command="LLMChatOptions.Prompt"
      showFullscreenToggle={{}}
      clickCatchStyle={{ opacity: 1 }}
      onClickClose={false}
      contentClassName="p-2 flex-col gap-1 f-1"
      rootChildClassname="f-1"
      button={
        <Btn
          title="Prompt"
          {...ChatActionBarBtnStyleProps}
          iconPath={
            prompt?.options?.prompt_type === "dashboards" ?
              mdiViewCarousel
            : undefined
          }
        >
          {prompt?.name}
        </Btn>
      }
    >
      <SmartCardList
        style={{
          maxWidth: "min(600px, 100vw)",
        }}
        sql={dbsSql}
        showTopBar={{ insert: true }}
        rowProps={{
          className: "pointer hover-bg",
        }}
        showEdit={true}
        tableName={"llm_prompts"}
        db={dbs as DBHandlerClient}
        methods={dbsMethodSchema}
        tables={dbsTables}
        fieldConfigs={
          [
            {
              name: "name",
              renderMode: "full",
              render: (name, newPrompt) => {
                const { id, description } = newPrompt;
                const isActive = activeChat.llm_prompt_id === id;
                return (
                  <Btn
                    className={"p-0 text-0 ta-start max-w-full ws-pre-wrap"}
                    style={{ padding: 0 }}
                    variant="text"
                    iconPath={isActive ? mdiCheck : mdiCircleOutline}
                    iconStyle={isActive ? { opacity: 1 } : { opacity: 0 }}
                    onClickPromise={async () => {
                      await onErrorAlert(async () => {
                        if (!activeChatId) return;
                        await setChatPrompt({
                          dbs,
                          chatId: activeChatId,
                          prompt: newPrompt,
                        });
                      });
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
            {
              name: "options",
              hide: true,
            },
          ] satisfies FieldConfig<DBSSchema["llm_prompts"]>[]
        }
      />
      {prompt && (
        <CodeEditorWithSaveButton
          key={prompt.id}
          value={prompt.prompt}
          label={<div className="ml-1">Prompt template</div>}
          headerButtons={
            <PopupMenu
              title="Prompt preview"
              subTitle="Preview of the prompt with context variables filled in"
              positioning="fullscreen"
              button={<Btn iconPath={mdiFileEyeOutline} title="Preview" />}
              data-command="LLMChatOptions.Prompt.Preview"
              contentClassName="p-2"
              showFullscreenToggle={{}}
              rootChildClassname="f-1"
              onClickClose={false}
            >
              <Marked
                className="f-1 m-auto"
                content={promptContent || ""}
                loadedSuggestions={undefined}
                codeHeader={undefined}
                sqlHandler={undefined}
              />
            </PopupMenu>
          }
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
      )}
    </PopupMenu>
  );
};
