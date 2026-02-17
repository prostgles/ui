import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { Marked } from "@components/Chat/Marked";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import PopupMenu from "@components/PopupMenu";
import { mdiFileEyeOutline, mdiToolboxOutline } from "@mdi/js";
import { usePromise } from "prostgles-client";
import React from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";

export const PromptAndAllowedMcpToolsSchemaPreviews = (props: {
  chatId: number;
  dbSchemaForPrompt: string;
  prompt: DBSSchema["llm_prompts"] | undefined;
  connectionId: string;
}) => {
  const { chatId, dbSchemaForPrompt, prompt, connectionId } = props;
  const { dbsMethods } = usePrglCore();
  const tools = usePromise(async () => {
    const allowedTools = await dbsMethods.getLLMAllowedChatTools?.({
      chatId,
    });
    return allowedTools?.map(({ name, description, input_schema }) => ({
      name,
      description,
      input_schema,
    }));
  }, [chatId, dbsMethods]);

  const promptContent = usePromise(async () => {
    if (!prompt) return "";
    return (
      dbsMethods.getFullPrompt?.({
        prompt: prompt.prompt,
        schema: dbSchemaForPrompt,
        connectionId,
      }) || prompt.prompt
    );
  }, [dbSchemaForPrompt, dbsMethods, prompt, connectionId]);

  return (
    <>
      {" "}
      <PopupMenu
        title="Preview of the prompt with context variables filled in"
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
      <PopupMenu
        title="Preview of tool list"
        positioning="fullscreen"
        button={<Btn iconPath={mdiToolboxOutline} title="Preview tools" />}
        contentClassName="p-2"
        showFullscreenToggle={{}}
        rootChildClassname="f-1"
        onClickClose={false}
      >
        <MonacoEditor
          loadedSuggestions={undefined}
          className="f-1 w-full h-full"
          value={JSON.stringify(tools, null, 2)}
          language="json"
          options={MONACO_READONLY_DEFAULT_OPTIONS}
        />
      </PopupMenu>
    </>
  );
};
