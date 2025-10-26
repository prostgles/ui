import {
  mdiDatabaseEdit,
  mdiDatabaseSearch,
  mdiLanguageTypescript,
  mdiOpenInNew,
  mdiScript,
  mdiTools,
} from "@mdi/js";
import type { DBSchema, JSONB } from "prostgles-types";
import React, { useState } from "react";
import {
  getMCPToolNameParts,
  type PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "@common/prostglesMcp";
import { sliceText } from "@common/utils";
import { useAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import { Marked } from "@components/Chat/Marked";
import Chip from "@components/Chip";
import { FlexCol, FlexRowWrap } from "@components/Flex";
import { usePrgl } from "../../../../../../pages/ProjectConnection/PrglContextProvider";
import { isDefined } from "../../../../../../utils";
import type { ProstglesMCPToolsProps } from "../ProstglesToolUseMessage";
import type { DBSSchema } from "@common/publishUtils";

export const LoadSuggestedToolsAndPrompt = ({
  chatId,
  message,
}: ProstglesMCPToolsProps) => {
  const { dbs, connectionId } = usePrgl();
  const data = message.input as JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_tools_and_prompt"]["schema"]["type"]
  >;

  const { addAlert } = useAlert();
  const [expandPrompt, setExpandPrompt] = useState(false);
  const dbAccess = data.suggested_database_access;
  return (
    <FlexCol>
      <Chip
        title={"Prompt"}
        color="blue"
        className="pointer"
        leftIcon={{ path: mdiScript }}
        onClick={() => {
          setExpandPrompt((prev) => !prev);
        }}
      >
        {sliceText(data.suggested_prompt, 70)}
      </Chip>
      {expandPrompt && (
        <Marked
          codeHeader={undefined}
          loadedSuggestions={undefined}
          sqlHandler={undefined}
          content={data.suggested_prompt}
        />
      )}

      {dbAccess.Mode !== "None" && (
        <Chip
          title="Database access"
          leftIcon={{
            path:
              dbAccess.Mode === "execute_sql_commit" ?
                mdiDatabaseEdit
              : mdiDatabaseSearch,
          }}
          color="blue"
        >
          {dbAccess.Mode === "Custom" ?
            //@ts-ignore
            dbAccess.tables
              .map((t) => {
                return `${t.tableName}: ${[
                  "select",
                  "update",
                  "insert",
                  "delete",
                ]
                  .filter((v) => t[v])
                  .join(", ")}`;
              })
              .join("\n")
          : dbAccess.Mode === "execute_sql_rollback" ?
            "Execute SQL with rollback"
          : "Execute SQL with commit"}
        </Chip>
      )}
      <FlexRowWrap>
        {data.suggested_mcp_tool_names.map((toolName, idx) => {
          return (
            <Chip
              key={toolName + idx}
              title="MCP Tool"
              color="blue"
              leftIcon={{ path: mdiTools }}
            >
              {toolName}
            </Chip>
          );
        })}
        {data.suggested_database_tool_names?.map((funcName, idx) => {
          return (
            <Chip
              key={funcName + idx}
              color="blue"
              title="Database Function"
              leftIcon={{ path: mdiLanguageTypescript }}
            >
              {funcName}
            </Chip>
          );
        })}
      </FlexRowWrap>
      <Btn
        color="action"
        iconPath={mdiOpenInNew}
        variant="filled"
        data-command="AskLLMChat.LoadSuggestedToolsAndPrompt"
        onClickPromise={async () => {
          if (data.suggested_mcp_tool_names.length) {
            await dbs.llm_chats_allowed_mcp_tools.delete({
              chat_id: chatId,
            });
            const allowedMcpTools = await dbs.mcp_server_tools.find({
              $or: data.suggested_mcp_tool_names
                .map((toolName) => {
                  const nameParts = getMCPToolNameParts(toolName);
                  if (!nameParts) return;
                  return {
                    server_name: nameParts.serverName,
                    name: nameParts.toolName,
                  };
                })
                .filter(isDefined),
            });
            await dbs.llm_chats_allowed_mcp_tools.insert(
              allowedMcpTools.map((t) => {
                return {
                  chat_id: chatId,
                  tool_id: t.id,
                  auto_approve: true,
                };
              }),
            );
          }

          if (data.suggested_database_tool_names?.length) {
            await dbs.llm_chats_allowed_functions.delete({
              chat_id: chatId,
            });
            const allowedFunctions = await dbs.published_methods.find({
              $or: data.suggested_database_tool_names.map((toolName) => {
                const name = getMCPToolNameParts(toolName)!.toolName;
                return {
                  connection_id: connectionId,
                  name,
                };
              }),
            });
            await dbs.llm_chats_allowed_functions.insert(
              allowedFunctions.map((t) => {
                return {
                  connection_id: connectionId,
                  chat_id: chatId,
                  server_function_id: t.id,
                  auto_approve: true,
                };
              }),
            );
          }

          const dbAccess = data.suggested_database_access;
          await dbs.llm_chats.update(
            { id: chatId },
            {
              db_data_permissions:
                dbAccess.Mode === "execute_sql_commit" ?
                  { Mode: "Run commited SQL", auto_approve: true }
                : dbAccess.Mode === "execute_sql_rollback" ?
                  { Mode: "Run readonly SQL", auto_approve: true }
                : dbAccess.Mode === "Custom" ?
                  { ...dbAccess, auto_approve: true }
                : dbAccess,
            },
          );

          addAlert({
            children: (
              <FlexCol className="ta-start">
                <div>The following were applied to this chat:</div>
                {data.suggested_mcp_tool_names.length ?
                  <span>
                    MCP Tools:{" "}
                    <ul>
                      {data.suggested_mcp_tool_names.map((name) => (
                        <li key={name} className="bold">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </span>
                : null}
                {data.suggested_database_tool_names?.length ?
                  <div>
                    DB Functions:{" "}
                    <ul>
                      {data.suggested_database_tool_names.map((name) => (
                        <li key={name} className="bold">
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                : null}

                {dbAccess.Mode !== "Custom" && (
                  <div>
                    Database Access: <strong>{dbAccess.Mode}</strong>
                  </div>
                )}
                {dbAccess.Mode === "Custom" && (
                  <div>
                    Table access:
                    <ul>
                      {dbAccess.tables.map((t) => (
                        <li key={t.tableName}>
                          <strong>{t.tableName}</strong>:{" "}
                          {[
                            t.select ? "select" : null,
                            t.update ? "update" : null,
                            t.insert ? "insert" : null,
                            t.delete ? "delete" : null,
                          ]
                            .filter(isDefined)
                            .join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </FlexCol>
            ),
          });
        }}
      >
        Load task chat
      </Btn>
    </FlexCol>
  );
};
