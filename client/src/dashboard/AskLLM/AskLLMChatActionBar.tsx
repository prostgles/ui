import { mdiTools } from "@mdi/js";
import type { DetailedJoinSelect } from "prostgles-types";
import React, { useMemo } from "react";
import { dashboardTypes } from "../../../../commonTypes/DashboardTypes";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import Btn from "../../components/Btn";
import { MarkdownMonacoCode } from "../../components/Chat/MarkdownMonacoCode";
import { FlexRow } from "../../components/Flex";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";
import { MCPServers } from "../../pages/ServerSettings/MCPServers/MCPServers";
import type { AskLLMChatProps } from "./AskLLMChat";

export const AskLLMChatActionBar = (
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
  const { data: models } = dbs.llm_models.useFind(
    {},
    {
      select: {
        "*": 1,
        llm_credentials: {
          $leftJoin: [{ table: "llm_providers" }, { table: "llm_credentials" }],
          select: "*",
          limit: 1,
        } satisfies DetailedJoinSelect,
      },
    },
  );
  const [loading, setLoading] = React.useState(false);
  const { data: allowedTools } = dbs.mcp_server_tools.useSubscribe(
    {
      $existsJoined: {
        "llm_chats_allowed_mcp_tools.llm_chats": {
          id: activeChatId,
        },
      } as any,
    },
    {
      select: {
        name: 1,
        server_name: 1,
      },
    },
  );

  return (
    <FlexRow className="gap-p5 pr-1">
      <PopupMenu
        title="MCP Tools"
        contentClassName="p-0 py-1"
        clickCatchStyle={{ opacity: 1 }}
        onClickClose={false}
        data-command="LLMChatOptions.MCPTools"
        onContentFinishedResizing={() => setLoading(false)}
        button={
          <Btn
            title={`MCP Tools Allowed in this chat${
              allowedTools?.length ?
                `: \n\n${allowedTools.map((t) => t.name).join("\n")}`
              : ""
            }`}
            variant="icon"
            size="small"
            color={allowedTools?.length ? "action" : undefined}
            iconPath={mdiTools}
            loading={loading}
            style={{
              opacity: 0.75,
            }}
            disabledInfo={
              !prgl.dbsMethods.getMcpHostInfo ? "Must be admin" : undefined
            }
            children={allowedTools?.length || null}
          />
        }
      >
        <MCPServers {...props.prgl} chatId={activeChat.id} />
      </PopupMenu>
      <PopupMenu
        title="Prompt"
        positioning="center"
        clickCatchStyle={{ opacity: 1 }}
        onClickClose={false}
        contentClassName="p-2 flex-col gap-1"
        button={
          <Btn
            title="Prompt"
            variant="icon"
            size="small"
            style={{ opacity: 0.75 }}
          >
            {prompt?.name}
          </Btn>
        }
      >
        <Select
          fullOptions={setupState.prompts.map((p) => ({
            key: p.id,
            label: p.name,
            subLabel: p.description || "",
          }))}
          variant="search-list-only"
          title={"Prompt selection"}
          multiSelect={false}
          value={activeChat.llm_prompt_id}
          onChange={(llm_prompt_id) => {
            if (!activeChatId) return;
            dbs.llm_chats.update(
              { id: activeChatId },
              {
                llm_prompt_id,
              },
            );
          }}
        />
        <MarkdownMonacoCode
          title="Prompt"
          codeString={promptContent}
          language="text"
          codeHeader={undefined}
        />
      </PopupMenu>
      <Select
        fullOptions={
          models?.map(({ id, name, provider_id, llm_credentials }) => ({
            key: id,
            label: name,
            subLabel: provider_id,
            disabledInfo:
              !llm_credentials.length ? "No credentials" : undefined,
          })) ?? []
        }
        size="small"
        btnProps={{
          variant: "icon",
          iconPath: "",
          style: {
            opacity: 0.75,
          },
        }}
        title="Model"
        emptyLabel="Select model..."
        className="ml-auto text-2"
        multiSelect={false}
        value={activeChat.model}
        onChange={(model) => {
          if (!activeChatId) return;
          dbs.llm_chats.update(
            { id: activeChatId },
            {
              model,
            },
          );
        }}
      />
    </FlexRow>
  );
};
