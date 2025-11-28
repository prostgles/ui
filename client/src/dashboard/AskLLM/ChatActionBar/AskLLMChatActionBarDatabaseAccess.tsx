import { mdiDatabase } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React from "react";
import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import PopupMenu from "@components/PopupMenu";
import { SmartForm } from "../../SmartForm/SmartForm";
import type { AskLLMChatProps } from "../Chat/AskLLMChat";
import { ChatActionBarBtnStyleProps } from "./AskLLMChatActionBar";

export const AskLLMChatActionBarDatabaseAccess = (
  props: Pick<AskLLMChatProps, "prgl" | "setupState"> & {
    activeChat: DBSSchema["llm_chats"];
    dbSchemaForPrompt: string;
  },
) => {
  const { prgl, activeChat } = props;
  const activeChatId = activeChat.id;
  const { dbs, dbsMethods, dbsTables } = prgl;

  const { data: llm_chats_allowed_functions } =
    dbs.llm_chats_allowed_functions.useSubscribe({
      chat_id: activeChatId,
      connection_id: prgl.connectionId,
    });

  const allowedFunctions = llm_chats_allowed_functions?.length;
  const dataPermission = activeChat.db_data_permissions;
  const tablePermissionInfo =
    dataPermission?.Mode === "Custom" ?
      dataPermission.tables.map(
        (t) =>
          `${t.tableName}: ${["select", "update", "insert", "delete"].filter((v) => t[v])}`,
      )
    : undefined;
  return (
    <PopupMenu
      data-command="LLMChatOptions.DatabaseAccess"
      contentClassName="p-0 max-w-700"
      positioning="above-center"
      title="Database access"
      button={
        <Btn
          iconPath={mdiDatabase}
          {...ChatActionBarBtnStyleProps}
          title={[
            `Database access for this chat:\n`,
            `Schema read access: ${activeChat.db_schema_permissions?.type ?? "None"}`,
            `Data: \n ${(tablePermissionInfo || dataPermission?.Mode) ?? "None"}`,
            allowedFunctions ? `Allowed Functions: ${allowedFunctions}` : "",
          ].join("\n")}
          color={
            (
              (dataPermission && dataPermission.Mode !== "None") ||
              llm_chats_allowed_functions?.length
            ) ?
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
        tables={dbsTables}
        methods={dbsMethods}
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
          tables: props.prgl.tables,
          schemaStyles: [
            {
              path: ["3", "tables"],
              style: {
                width: "100%",
              },
            },
          ],
        }}
      />
    </PopupMenu>
  );
};
