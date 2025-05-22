import {
  mdiAccountKey,
  mdiCheck,
  mdiCircleOutline,
  mdiDatabase,
  mdiTools,
} from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { DetailedJoinSelect, FilterItem } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { dashboardTypes } from "../../../../commonTypes/DashboardTypes";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from "../../components/Flex";
import PopupMenu from "../../components/PopupMenu";
import Select, { type FullOption } from "../../components/Select/Select";
import { SvgIconFromURL } from "../../components/SvgIcon";
import { MCPServers } from "../../pages/ServerSettings/MCPServers/MCPServers";
import { CodeEditorWithSaveButton } from "../CodeEditor/CodeEditorWithSaveButton";
import { SmartCardList } from "../SmartCardList/SmartCardList";
import { SmartForm } from "../SmartForm/SmartForm";
import type { AskLLMChatProps } from "./AskLLMChat";
import { MonacoEditor } from "../../components/MonacoEditor/MonacoEditor";
import Tabs from "../../components/Tabs";

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
        llm_providers: {
          logo_url: 1,
        },
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
      },
    } as FilterItem,
    {
      select: {
        name: 1,
        server_name: 1,
      },
    },
  );

  const [addProviderCredentials, setAddProviderCredentials] = useState("");

  return (
    <FlexRow className="gap-p5 pr-1">
      {addProviderCredentials && (
        <SmartForm
          label={"Add LLM credentials for " + addProviderCredentials}
          asPopup={true}
          tableName="llm_credentials"
          db={dbs as DBHandlerClient}
          methods={prgl.dbsMethods}
          defaultData={{
            provider_id: addProviderCredentials,
          }}
          onClose={() => setAddProviderCredentials("")}
          tables={prgl.dbsTables}
          showJoinedTables={false}
        />
      )}
      <PopupMenu
        title="MCP Tools"
        contentClassName="p-2"
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
            {...btnStyleProps}
            color={allowedTools?.length ? "action" : undefined}
            iconPath={mdiTools}
            loading={loading}
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
        title="Database access"
        data-command="LLMChatOptions.DatabaseAccess"
        contentClassName="p-2"
        positioning="above-center"
        button={
          <Btn
            iconPath={mdiDatabase}
            {...btnStyleProps}
            color={
              activeChat.db_data_permissions?.type === "Run SQL" ?
                "action"
              : undefined
            }
          />
        }
        onClickClose={false}
      >
        <SmartForm
          db={dbs as DBHandlerClient}
          label=""
          tableName="llm_chats"
          rowFilter={[{ fieldName: "id", value: activeChatId }]}
          tables={prgl.dbsTables}
          methods={prgl.dbsMethods}
          columns={{
            db_schema_permissions: 1,
            db_data_permissions: 1,
          }}
          confirmUpdates={false}
          disabledActions={["delete", "clone", "update"]}
          showJoinedTables={false}
          contentClassname="p-0"
          jsonbSchemaWithControls={{ variant: "no-labels" }}
        />
      </PopupMenu>
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
      <Select
        data-command="LLMChatOptions.Model"
        fullOptions={
          models
            ?.map(
              ({ id, name, provider_id, llm_credentials, llm_providers }) => {
                const noCredentials = !llm_credentials.length;
                const iconUrl = llm_providers[0]?.logo_url;
                return {
                  key: id,
                  label: name,
                  subLabel: provider_id,
                  leftContent:
                    !iconUrl ? undefined : (
                      <SvgIconFromURL
                        url={iconUrl}
                        className="mr-p5 text-0"
                        style={{
                          width: "24px",
                          height: "24px",
                        }}
                      />
                    ),
                  rightContent:
                    noCredentials ?
                      <Btn
                        title="Add provider API Key"
                        onClick={() => setAddProviderCredentials(provider_id)}
                        color="action"
                        iconPath={mdiAccountKey}
                      />
                    : undefined,
                  disabledInfo: noCredentials ? "No credentials" : undefined,
                } satisfies FullOption<number>;
              },
            )
            .slice()
            .sort(
              (a, b) =>
                (a.disabledInfo?.length ?? 0) - (b.disabledInfo?.length ?? 0) ||
                a.label.localeCompare(b.label),
            ) ?? []
        }
        size="small"
        btnProps={{
          ...btnStyleProps,
          iconPath: "",
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

const btnStyleProps = {
  variant: "icon",
  size: "small",
  style: { opacity: 0.75 },
} as const;
