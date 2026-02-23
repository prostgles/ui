import { LLM_PROMPT_VARIABLES } from "@common/llmUtils";
import type { DBSSchema } from "@common/publishUtils";
import { getEntries } from "@common/utils";
import Btn from "@components/Btn";
import { FlexRowWrap } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { JSONBSchemaLookup } from "@components/JSONBSchema/JSONBSchemaLookup";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import PopupMenu from "@components/PopupMenu";
import { SearchList } from "@components/SearchList/SearchList";
import { Select } from "@components/Select/Select";
import { SwitchToggle } from "@components/SwitchToggle";
import {
  mdiDatabase,
  mdiDatabaseEdit,
  mdiDatabaseEye,
  mdiDatabaseOff,
  mdiDatabaseSearch,
  mdiEye,
  mdiLinkVariant,
  mdiTable,
  mdiTableEye,
  mdiTableSearch,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useMemo } from "react";
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
    dataPermission?.Mode === "Custom" ?
      Array.from(getEntries(dataPermission.tables)).map(
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
    if (!dataPermission || dataPermission.Mode === "None") {
      return;
    }

    const { Mode } = dataPermission;
    const canEditData =
      dataPermission.Mode === "Custom" &&
      Object.values(dataPermission.tables).some(
        (t) => t.update || t.insert || t.delete,
      );
    const icon = {
      "Run readonly SQL": mdiDatabaseSearch,
      Custom: canEditData ? mdiTable : mdiTableSearch,
      "Run commited SQL": mdiDatabaseEdit,
    }[Mode];
    return { icon, Mode };
  }, [dataPermission]);

  return (
    <PopupMenu
      data-command="LLMChatOptions.DatabaseAccess"
      contentClassName="p-1 gap-2 max-w-700"
      positioning="above-center"
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
            `Data: \n ${(tablePermissionInfo?.join(", ") || dataPermission?.Mode) ?? "None"}`,
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
        <Icon className="text-1 mt-p25" path={mdiDatabaseEye} />
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
                subLabel: "Send schema for all dashboard tables.",
                iconPath: mdiDatabase,
              },
              {
                key: "Custom",
                subLabel: "Send schema only for selected tables.",
                iconPath: mdiTableSearch,
              },
              {
                key: "SameAsData",
                label: "Same as data access",
                subLabel:
                  "Inherit schema scope from data access (Custom tables, or Full when SQL access allows it).",
                iconPath: mdiLinkVariant,
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
            <Btn title="Preview schema" variant="faded" iconPath={mdiEye} />
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
      <FlexRowWrap className="gap-p5 ai-start">
        <Icon className="text-1 mt-p25" path={mdiTableEye} />
        <Select
          label={{ label: "Data access" }}
          value={dataPermission?.Mode}
          data-command="LLMChatOptions.DatabaseAccess.data"
          btnProps={
            dataPermission && dataPermission.Mode !== "None" ?
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
                  "Cannot interact with the database (schema access is controlled separately).",
                iconPath: mdiDatabaseOff,
              },
              {
                key: "Run readonly SQL",
                subLabel:
                  "Can run readonly SQL queries (if the current user is allowed)",
                iconPath: mdiTableSearch,
              },
              {
                key: "Run commited SQL",
                subLabel:
                  "Can run SQL queries that will be commited (if the current user is allowed). Use with caution",
                iconPath: mdiDatabaseEdit,
              },
              {
                key: "Custom",
                subLabel:
                  "Can only access specific tables on behalf of the user",
                iconPath: mdiTable,
              },
            ] as const
          }
          onChange={(dataAccess) => {
            void dbs.llm_chats.update(
              { id: activeChatId },
              {
                db_data_permissions:
                  dataAccess === "Custom" ?
                    {
                      Mode: dataAccess,
                      tables: {},
                    }
                  : {
                      Mode: dataAccess,
                    },
              },
            );
          }}
        />
        {dataPermission && dataPermission.Mode !== "None" && (
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
        )}
        {dataPermission?.Mode === "Custom" && (
          <div className="w-full pl-2">
            <SearchList
              id="custom-tables"
              className="shadow"
              style={{
                maxHeight: "min(400px, calc(100vh - 100px)",
              }}
              placeholder={`Search ${tables.length} tables & views`}
              limit={200}
              items={tables
                .toSorted((a, b) => {
                  const aRule = dataPermission.tables[a.name];
                  const bRule = dataPermission.tables[b.name];
                  /** Bring tables with rules first */
                  if (aRule && !bRule) return -1;
                  if (!aRule && bRule) return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((t) => {
                  const tableRules = dataPermission.tables[t.name] ?? {};

                  return {
                    key: t.name,
                    styles: {
                      labelWrapper: {
                        fontWeight: 500,
                        minWidth: "60px",
                      },
                      rowInner:
                        window.isLowWidthScreen ?
                          {
                            flexDirection: "column",
                            gap: "1em",
                            alignItems: "start",
                            overflow: "auto",
                          }
                        : {},
                    },
                    title: t.name,
                    rowStyle: { border: "1px solid var(--b-default)" },
                    contentLeft: (
                      <Icon
                        className="mr-p5 text-2"
                        title={t.info.isView ? "View" : "Table"}
                        path={t.info.isView ? mdiTableEye : mdiTable}
                      />
                    ),
                    contentRight: (
                      <>
                        {(
                          ["select", "insert", "update", "delete"] as const
                        ).map((ruleType) => {
                          const isOn = tableRules[ruleType];
                          return (
                            <Btn
                              key={ruleType}
                              color={isOn ? "action" : "default"}
                              variant={isOn ? "filled" : undefined}
                              size="small"
                              onClick={() => {
                                const shouldTurnOn = !isOn;
                                const newTableRules = {
                                  ...dataPermission.tables,
                                  [t.name]: {
                                    ...tableRules,
                                    [ruleType]: shouldTurnOn || undefined,
                                  },
                                } as const;
                                void dbs.llm_chats.update(
                                  { id: activeChatId },
                                  {
                                    db_data_permissions: {
                                      Mode: "Custom",
                                      tables: newTableRules,
                                    },
                                  },
                                );
                              }}
                            >
                              {ruleType.toUpperCase()}
                            </Btn>
                          );
                        })}
                      </>
                    ),
                  };
                })}
            />
          </div>
        )}
      </FlexRowWrap>
      {/* <SmartForm
        db={dbs as DBHandlerClient}
        sql={dbsSql}
        label=""
        tableName="llm_chats"
        rowFilter={[{ fieldName: "id", value: activeChatId }]}
        tables={dbsTables}
        methods={dbsMethodSchema}
        columns={{
          db_schema_permissions: 1,
          db_data_permissions: 1,
        }}
        confirmUpdates={false}
        disabledActions={["delete", "clone", "update"]}
        showJoinedTables={{
          llm_chats_allowed_functions: {},
        }}
        contentClassname="p-1"
        // contentClassname="p-0 pb-1"
        jsonbSchemaWithControls={{
          tables,
          schemaStyles: [
            {
              path: ["3", "tables"],
              style: {
                width: "100%",
              },
            },
          ],
        }}
      /> */}
    </PopupMenu>
  );
};
