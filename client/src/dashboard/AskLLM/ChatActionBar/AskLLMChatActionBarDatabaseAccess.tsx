import {
  mdiDatabase,
  mdiDatabaseEdit,
  mdiDatabaseSearch,
  mdiTable,
  mdiTableSearch,
} from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useMemo } from "react";
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
          `${t.tableName}: ${["select", "update", "insert", "delete"].filter((v) => t[v]).join(", ")}`,
      )
    : undefined;

  const schemaPermission = activeChat.db_schema_permissions;
  const schemaActiveIcon = useMemo(() => {
    if (!schemaPermission || schemaPermission.type === "None") {
      return;
    }
    return mdiDatabase;
  }, [schemaPermission]);
  const databaseActiveIcon = useMemo(() => {
    if (!dataPermission || dataPermission.Mode === "None") {
      return;
    }

    const { Mode } = dataPermission;
    const canEditData =
      dataPermission.Mode === "Custom" &&
      dataPermission.tables.some((t) => t.update || t.insert || t.delete);
    return {
      "Run readonly SQL": mdiDatabaseSearch,
      Custom: canEditData ? mdiTable : mdiTableSearch,
      "Run commited SQL": mdiDatabaseEdit,
    }[Mode];
  }, [dataPermission]);

  return (
    <PopupMenu
      data-command="LLMChatOptions.DatabaseAccess"
      contentClassName="p-0 max-w-700"
      positioning="above-center"
      title="Database access"
      button={
        <Btn
          {...ChatActionBarBtnStyleProps}
          iconPath={databaseActiveIcon ?? schemaActiveIcon ?? mdiDatabase}
          title={[
            `Database access for this chat:\n`,
            `Schema read access: ${activeChat.db_schema_permissions?.type ?? "None"}`,
            `Data: \n ${(tablePermissionInfo?.join(", ") || dataPermission?.Mode) ?? "None"}`,
            allowedFunctions ? `Allowed Functions: ${allowedFunctions}` : "",
          ].join("\n")}
          color={
            (
              (schemaActiveIcon ?? mdiDatabase) ||
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
