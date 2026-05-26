import { LLM_PROMPT_VARIABLES } from "@common/llmUtils";
import type { DBSSchema } from "@common/publishUtils";
import { getEntries } from "@common/utils";
import Btn from "@components/Btn";
import { FlexRowWrap } from "@components/Flex";
import { JSONBSchemaLookup } from "@components/JSONBSchema/JSONBSchemaLookup";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import PopupMenu from "@components/PopupMenu";
import { Select } from "@components/Select/Select";
import { SwitchToggle } from "@components/SwitchToggle";
import {
  mdiDatabase,
  mdiDatabaseCheck,
  mdiDatabaseEdit,
  mdiDatabaseEye,
  mdiDatabaseOff,
  mdiDatabaseSearch,
  mdiLinkVariant,
  mdiTable,
  mdiTableSearch,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useMemo } from "react";
import { DatabaseAccessEditor } from "src/dashboard/DatabaseAccessEditor/DatabaseAccessEditor";
import type { AskLLMChatProps } from "../Chat/AskLLMChat";
import { ChatActionBarBtnStyleProps } from "./AskLLMChatActionBar";

export const AskLLMChatActionBarDatabaseAccess = (
  props: Pick<AskLLMChatProps, "setupState"> & {
    activeChat: DBSSchema["llm_chats"];
    dbSchemaForPrompt: string;
    prompt: DBSSchema["llm_prompts"] | undefined;
  },
) => {
  const { activeChat, dbSchemaForPrompt } = props;
  const prompt = props.prompt?.prompt;
  const activeChatId = activeChat.id;
  const { dbs, connectionId, tables, db } = usePrgl();

  const { data: llm_chats_allowed_functions } =
    dbs.llm_chats_allowed_functions.useSubscribe({
      chat_id: activeChatId,
      connection_id: connectionId,
    });

  const allowedFunctions = llm_chats_allowed_functions?.length;
  const dataPermission = activeChat.db_data_permissions;
  const tablePermissionInfo =
    dataPermission?.mode === "custom" ?
      Array.from(getEntries(dataPermission.tablePermissions)).map(
        ([tableName, t]) =>
          `${tableName}: ${["select", "update", "insert", "delete"].filter((v) => t[v]).join(", ")}`,
      )
    : undefined;

  const schemaPermission = activeChat.db_schema_permissions;
  const schemaReadAccess = useMemo(() => {
    if (!schemaPermission || schemaPermission.type === "None") {
      return;
    }
    /**
     * db_schema_permissions simply allows the backend to replace the schema variable from the prompt with actual schema before sending.
     * If the prompt doesn't use the schema variable then no point showing the icon
     */
    if (!prompt?.includes(LLM_PROMPT_VARIABLES.SCHEMA)) {
      return;
    }
    return { icon: mdiDatabase, type: schemaPermission.type };
  }, [prompt, schemaPermission]);
  const databaseAccess = useMemo(() => {
    if (!dataPermission) {
      return;
    }

    const { mode } = dataPermission;
    const canEditData =
      dataPermission.mode === "custom" &&
      Object.values(dataPermission.tablePermissions).some(
        (t) => t.update || t.insert || t.delete,
      );
    const icon = {
      execute_readonly_sql: mdiDatabaseSearch,
      custom: canEditData ? mdiTable : mdiTableSearch,
      execute_sql: mdiDatabaseEdit,
    }[mode];
    return { icon, mode };
  }, [dataPermission]);

  return (
    <PopupMenu
      data-command="LLMChatOptions.DatabaseAccess"
      contentClassName="p-1 gap-2 max-w-800"
      positioning="center"
      title="Database access"
      clickCatchStyle={{ opacity: 1 }}
      button={
        <Btn
          {...ChatActionBarBtnStyleProps}
          iconPath={
            databaseAccess?.icon ?? schemaReadAccess?.icon ?? mdiDatabaseOff
          }
          title={[
            `Database access for this chat:\n`,
            `Schema read access: ${schemaReadAccess?.type ?? "None"}`,
            `Data: \n ${(tablePermissionInfo?.join(", ") || dataPermission?.mode) ?? "None"}`,
            allowedFunctions ? `Allowed Functions: ${allowedFunctions}` : "",
          ].join("\n")}
          color={
            schemaReadAccess?.icon || llm_chats_allowed_functions?.length ?
              "action"
            : undefined
          }
        />
      }
      onClickClose={false}
    >
      <FlexRowWrap className="gap-p5 ai-start">
        <Select
          label={{ label: "Schema access" }}
          data-command="LLMChatOptions.DatabaseAccess.schema"
          value={schemaPermission?.type}
          btnProps={
            schemaPermission && schemaPermission.type !== "None" ?
              {
                color: "action",
              }
            : {}
          }
          fullOptions={
            [
              {
                key: "None",
                subLabel:
                  "Do not send schema; schema variable resolves to an empty value.",
                iconPath: mdiDatabaseOff,
              },
              {
                key: "Full",
                subLabel: "Schema for all user tables applied to the prompt.",
                iconPath: mdiDatabaseEye,
              },
              {
                key: "Custom",
                subLabel: "Schema for selected tables applied to the prompt.",
                iconPath: mdiTableSearch,
              },
              {
                key: "SameAsData",
                label: "Same as data access",
                subLabel:
                  "Inherit schema scope from data access (Custom tables, or Full when SQL access allows it).",
                iconPath: mdiLinkVariant,
              },
              {
                key: "OnRequest",
                label: "On request",
                subLabel:
                  "Only send schema for tables requested by the LLM. Existing table names provided in the prompt.",
                iconPath: mdiDatabaseCheck,
              },
            ] as const
          }
          onChange={(schemaAccess) => {
            void dbs.llm_chats.update(
              { id: activeChatId },
              {
                db_schema_permissions:
                  schemaAccess === "Custom" ?
                    {
                      type: schemaAccess,
                      tables: [],
                    }
                  : {
                      type: schemaAccess,
                    },
              },
            );
          }}
        />
        <PopupMenu
          title="Preview of the database schema that will be sent to the LLM"
          positioning="fullscreen"
          className="as-end"
          onClickClose={false}
          button={
            <Btn title="Preview schema" variant="faded">
              Preview
            </Btn>
          }
        >
          <MonacoEditor
            language="sql"
            className="f-1"
            value={dbSchemaForPrompt}
            options={MONACO_READONLY_DEFAULT_OPTIONS}
            loadedSuggestions={undefined}
          />
        </PopupMenu>
        {schemaPermission?.type === "Custom" && (
          <div className="w-full pl-2">
            <JSONBSchemaLookup
              db={db}
              tables={tables}
              schema={{
                title: "Tables",
                type: "Lookup[]",
                lookup: {
                  isArray: true,
                  type: "schema",
                  object: "table",
                },
              }}
              value={schemaPermission.tables}
              onChange={(newTables: string[]) => {
                void dbs.llm_chats.update(
                  { id: activeChatId },
                  {
                    db_schema_permissions: {
                      type: "Custom",
                      tables: newTables,
                    },
                  },
                );
              }}
            />
          </div>
        )}
      </FlexRowWrap>
      <DatabaseAccessEditor
        value={dataPermission ?? undefined}
        newTables={[]}
        onChange={(newAccess) => {
          void dbs.llm_chats.update(
            { id: activeChatId },
            {
              db_data_permissions:
                !newAccess ? null : (
                  {
                    ...newAccess,
                    auto_approve: dataPermission?.auto_approve,
                  }
                ),
            },
          );
        }}
        contentRight={
          dataPermission && (
            <SwitchToggle
              label={"Auto approve"}
              title="If enabled, the system will automatically approve the SQL queries generated by the LLM without requiring manual approval. Use with caution, especially if the LLM has broad data access permissions."
              checked={dataPermission.auto_approve ?? false}
              variant="col"
              onChange={async (checked) => {
                await dbs.llm_chats.update(
                  { id: activeChatId },
                  {
                    db_data_permissions: {
                      ...dataPermission,
                      auto_approve: checked,
                    },
                  },
                );
              }}
            />
          )
        }
      />
    </PopupMenu>
  );
};
