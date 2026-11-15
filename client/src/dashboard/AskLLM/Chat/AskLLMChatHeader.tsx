import { getSmartGroupFilter } from "@common/filterUtils";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexRow } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import { Select } from "@components/Select/Select";
import { mdiDotsHorizontal, mdiPlus, mdiRobot } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useState } from "react";
import { t } from "../../../i18n/i18nUtils";
import { getPGIntervalAsText } from "../../W_SQL/customRenderers";
import {
  AskLLMChatSettings,
  type LLMChatOptionsProps,
} from "./AskLLMChatSettings";
import type { LLMChatState } from "./useLLMChat";

export const AskLLMChatHeader = (
  props: LLMChatState & Pick<LLMChatOptionsProps, "chatRootDiv" | "prompts">,
) => {
  const {
    activeChat,
    credentials,
    activeChatId,
    latestChats,
    chatsFilter,
    createNewChat,
    preferredPromptId,
    setActiveChat,
    chatRootDiv,
    prompts,
  } = props;

  const { dbs, user } = usePrgl();
  const [searchTerm, setSearchTerm] = useState("");
  const { data: matchingChats, error: searchError } = dbs.llm_chats.useFind(
    {
      $and: [
        chatsFilter,
        getSmartGroupFilter([
          {
            fieldName: "*",
            type: "$term_highlight",
            value: searchTerm,
            searchColumns: [
              { name: "name" },
              {
                name: "message",
                path: [{ table: "llm_messages", on: [{ id: "chat_id" }] }],
              },
            ],
          },
        ]),
      ],
    },
    { select: { id: 1 }, limit: null },
    { skip: !searchTerm },
  );
  const visibleChats = latestChats?.filter(
    (chat) =>
      !searchTerm || matchingChats?.some((match) => match.id === chat.id),
  );

  return (
    <FlexRow className="AskLLMChatHeader">
      {/* {!activeChat?.agent_info && (
        <FlexCol className="gap-p25">
          <div>{t.AskLLM["AI Assistant"]}</div>
        </FlexCol>
      )} */}
      <FlexRow className="gap-p25 min-w-0">
        <AskLLMChatSettings
          prompts={prompts}
          activeChat={activeChat}
          activeChatId={activeChatId}
          credentials={credentials}
          chatRootDiv={chatRootDiv}
        />
        <Select
          title={t.AskLLMChatHeader.Chat}
          data-command="LLMChat.select"
          data-key={activeChatId?.toString()}
          noSearchLimit={0}
          onSearch={setSearchTerm}
          endOfResultsContent={
            searchTerm && searchError ?
              <ErrorComponent error={searchError} />
            : undefined
          }
          fullOptions={
            visibleChats?.map((c) => ({
              key: c.id,
              label: c.name,
              iconPath: c.agent_info ? mdiRobot : undefined,
              subLabel: getPGIntervalAsText(c.created_ago, true, true, true),
              rightContent:
                c.status?.state === "loading" ?
                  <Loading sizePx={16} show />
                : undefined,
            })) ?? []
          }
          btnProps={{
            size: "default",
            children: <div className="text-ellipsis">{activeChat?.name}</div>,
          }}
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
          data-command="AskLLMChat.NewChat"
          variant="faded"
          color="action"
          size="default"
          disabledInfo={
            !preferredPromptId ?
              t.AskLLMChatHeader["No prompt found"]
            : undefined
          }
          onClickPromise={async () => {
            if (!preferredPromptId)
              throw new Error(t.AskLLMChatHeader["No prompt found"]);
            await createNewChat(preferredPromptId);
          }}
        />
      </FlexRow>

      {user && (
        <Select
          className="ml-auto"
          fullOptions={[
            { key: "right-panel", label: "Show as side panel (default)" },
            { key: "fullscreen", label: "Show in fullscreen" },
          ]}
          iconPath={mdiDotsHorizontal}
          value={user.options?.llmChatWindowPositioning ?? "right-panel"}
          showSelected={"icon"}
          btnProps={{
            variant: "icon",
          }}
          onChange={(chatWindowPositioning) => {
            void dbs.users.update(
              {
                id: user.id,
              },
              {
                options: {
                  $merge: [
                    {
                      llmChatWindowPositioning: chatWindowPositioning,
                    } satisfies Partial<NonNullable<typeof user.options>>,
                  ],
                },
              },
            );
          }}
        />
      )}
    </FlexRow>
  );
};
