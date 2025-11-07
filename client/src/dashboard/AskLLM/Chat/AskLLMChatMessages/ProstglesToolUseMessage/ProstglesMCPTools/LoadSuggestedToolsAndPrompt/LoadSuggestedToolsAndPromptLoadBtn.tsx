import {
  getMCPToolNameParts,
  type PROSTGLES_MCP_SERVERS_AND_TOOLS,
} from "@common/prostglesMcp";
import { useAlert } from "@components/AlertProvider";
import Btn from "@components/Btn";
import { FlexCol } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import {
  mdiLanguageTypescript,
  mdiOpenInNew,
  mdiTable,
  mdiTools,
} from "@mdi/js";
import type { JSONB } from "prostgles-types";
import React from "react";
import { usePrgl } from "../../../../../../../pages/ProjectConnection/PrglContextProvider";
import { isDefined } from "../../../../../../../utils";
import type { ProstglesMCPToolsProps } from "../../ProstglesToolUseMessage";

export const LoadSuggestedToolsAndPromptLoadBtn = ({
  chatId,
  message,
}: Pick<ProstglesMCPToolsProps, "chatId" | "message">) => {
  const { addAlert } = useAlert();
  const { dbs, connectionId } = usePrgl();
  const data = message.input as JSONB.GetObjectType<
    (typeof PROSTGLES_MCP_SERVERS_AND_TOOLS)["prostgles-ui"]["suggest_tools_and_prompt"]["schema"]["type"]
  >;

  return (
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
          if (allowedFunctions.length === 0) {
            throw new Error(
              `No database functions found for names: ${data.suggested_database_tool_names.join(", ")}`,
            );
          }
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
              : dbAccess.Mode === "Custom" ? { ...dbAccess, auto_approve: true }
              : dbAccess,
          },
        );

        addAlert({
          title: "Suggested tools and prompt loaded!",
          contentClassName: "p-1",
          children: (
            <FlexCol className="ta-start">
              {/* <div>The following were applied to this chat:</div> */}
              {data.suggested_mcp_tool_names.length ?
                <span>
                  MCP Tools:{" "}
                  <ul className="no-decor">
                    {data.suggested_mcp_tool_names.map((name) => (
                      <li
                        key={name}
                        className="bold flex-row gap-p5 ai-center py-p5"
                      >
                        <Icon path={mdiTools} />
                        <div>{name}</div>
                      </li>
                    ))}
                  </ul>
                </span>
              : null}
              {data.suggested_database_tool_names?.length ?
                <div>
                  DB Functions:{" "}
                  <ul className="no-decor">
                    {data.suggested_database_tool_names.map((name) => (
                      <li
                        key={name}
                        className="bold flex-row gap-p5 ai-center py-p5"
                      >
                        <Icon path={mdiLanguageTypescript} />
                        <div>{name}</div>
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
                  <ul className="no-decor">
                    {dbAccess.tables.map((t) => (
                      <li
                        key={t.tableName}
                        className="bold flex-row gap-p5 ai-center py-p5"
                      >
                        <Icon path={mdiTable} />
                        <div>
                          <strong>{t.tableName}</strong>:
                        </div>
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
  );
};
