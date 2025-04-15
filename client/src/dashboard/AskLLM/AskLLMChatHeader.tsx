import { mdiPlus, mdiScript, mdiWrench } from "@mdi/js";
import React, { useMemo } from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from "../../components/Flex";
import Select, { type FullOption } from "../../components/Select/Select";
import { t } from "../../i18n/i18nUtils";
import { getPGIntervalAsText } from "../W_SQL/customRenderers";
import { LLMChatOptions, type LLMChatOptionsProps } from "./LLMChatOptions";
import type { LLMChatState } from "./useLLMChat";
import type { LLMSetupStateReady } from "./useLLMSetupState";

export const AskLLMChatHeader = (
  props: LLMChatState &
    LLMSetupStateReady &
    LLMChatOptionsProps &
    Pick<Prgl, "connectionId">,
) => {
  const {
    activeChat,
    credentials,
    activeChatId,
    latestChats,
    createNewChat,
    defaultCredential,
    preferredPromptId,
    setActiveChat,
    prompts,
    chatRootDiv,
    connectionId,
    ...prgl
  } = props;

  const { dbs } = prgl;

  const chatPrompt = useMemo(() => {
    return activeChat?.llm_prompt_id ?
        prompts.find((p) => p.id === activeChat.llm_prompt_id)
      : undefined;
  }, [activeChat, prompts]);

  const { data: chatAllowedServerFuncs } =
    dbs.llm_chats_allowed_functions.useSubscribe({ chat_id: activeChatId });
  const { data: serverFuncs } = dbs.published_methods.useFind({
    connection_id: connectionId,
    $existsJoined: {
      llm_chats_allowed_functions: {
        chat_id: activeChatId,
      },
    },
  });

  const { data: chatAllowedMcpTools } =
    dbs.llm_chats_allowed_mcp_tools.useSubscribe({ chat_id: activeChatId });
  const { data: mcpTools } = dbs.mcp_server_tools.useFind();

  const toolSelectProps = useMemo(() => {
    const PREF = {
      func: "func",
      tool: "tool",
    } as const;
    const value = [
      ...(chatAllowedServerFuncs?.map(
        (f) => `${PREF.func}${f.server_function_id}`,
      ) ?? []),
      ...(chatAllowedMcpTools?.map((t) => `${PREF.tool}${t.tool_id}`) ?? []),
    ];
    const tools: FullOption[] = [
      ...(serverFuncs ?? []).map((f) => ({
        id: f.id.toString(),
        key: `${PREF.func}${f.id}`,
        label: f.name,
        subLabel: f.description,
      })),
      ...(mcpTools ?? []).map((t) => ({
        id: t.id.toString(),
        key: `${PREF.tool}${t.id}`,
        label: `${t.server_name} ${t.name}`,
        subLabel: t.description,
      })),
    ];
    const onChange = (selectedKeys: string[]) => {
      const selectedOpts = tools.filter((t) => selectedKeys.includes(t.key));
      const selectedFuncs = selectedOpts.filter(({ key }) => {
        return key.startsWith(PREF.func);
      });
      const chat_id = activeChatId;
      if (!chat_id) return;
      dbs.llm_chats_allowed_functions.delete({
        chat_id: activeChatId,
      });
      if (selectedFuncs.length) {
        dbs.llm_chats_allowed_functions.insert(
          selectedFuncs.map(({ id }) => ({
            chat_id,
            connection_id: connectionId,
            server_function_id: id!,
          })),
        );
      }
      const selectedTools = selectedOpts.filter(({ key }) => {
        return key.startsWith(PREF.tool);
      });
      dbs.llm_chats_allowed_mcp_tools.delete({
        chat_id,
      });
      if (selectedTools.length) {
        dbs.llm_chats_allowed_mcp_tools.insert(
          selectedTools.map(({ id }) => ({
            chat_id,
            tool_id: id!,
          })),
        );
      }
    };

    return {
      fullOptions: tools,
      onChange,
      value,
    };
  }, [
    serverFuncs,
    mcpTools,
    chatAllowedMcpTools,
    chatAllowedServerFuncs,
    activeChatId,
    connectionId,
    dbs,
  ]);

  return (
    <FlexRow className="AskLLMChatHeader">
      <FlexCol className="gap-p25">
        <div>{t.AskLLMChatHeader["Ask AI Assistan"]}t</div>
        <span className="text-2 font-14">({t.common.experimental})</span>
      </FlexCol>
      <FlexRow className="gap-p25 min-w-0">
        <LLMChatOptions
          dbsMethods={prgl.dbsMethods}
          dbs={prgl.dbs}
          dbsTables={prgl.dbsTables}
          prompts={props.prompts}
          activeChat={activeChat}
          activeChatId={activeChatId}
          credentials={credentials}
          chatRootDiv={chatRootDiv}
        />
        <Select
          title={t.AskLLMChatHeader.Chat}
          fullOptions={
            latestChats?.map((c) => ({
              key: c.id,
              label: c.name,
              subLabel: getPGIntervalAsText(c.created_ago, true, true, true),
            })) ?? []
          }
          value={activeChatId}
          showSelectedSublabel={true}
          style={{
            flex: 1,
            minWidth: "80px",
            maxWidth: "fit-content",
          }}
          onChange={(v) => {
            setActiveChat(v);
          }}
        />
        <Btn
          iconPath={mdiPlus}
          title={t.AskLLMChatHeader["New chat"]}
          variant="faded"
          color="action"
          disabledInfo={
            !preferredPromptId ?
              t.AskLLMChatHeader["No prompt found"]
            : undefined
          }
          onClickPromise={async () => {
            if (!preferredPromptId)
              throw new Error(t.AskLLMChatHeader["No prompt found"]);
            createNewChat(preferredPromptId);
          }}
        />
      </FlexRow>
    </FlexRow>
  );
};
