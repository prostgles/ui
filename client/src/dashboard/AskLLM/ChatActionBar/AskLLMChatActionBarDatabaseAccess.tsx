import { mdiDatabase } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React from "react";
import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
import Btn from "../../../components/Btn";
import PopupMenu from "../../../components/PopupMenu";
import { SmartForm } from "../../SmartForm/SmartForm";
import type { AskLLMChatProps } from "../Chat/AskLLMChat";
import { btnStyleProps } from "./AskLLMChatActionBar";

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

  return (
    <PopupMenu
      data-command="LLMChatOptions.DatabaseAccess"
      contentClassName="p-0 max-w-700"
      positioning="above-center"
      title="Database access"
      button={
        <Btn
          iconPath={mdiDatabase}
          {...btnStyleProps}
          title={[
            `Database access for this chat:\n`,
            `Schema read access: ${activeChat.db_schema_permissions?.type}`,
            `Data: ${activeChat.db_data_permissions?.type} ${
              activeChat.db_data_permissions?.type === "Run SQL" ?
                activeChat.db_data_permissions.commit ?
                  " (with commit)"
                : "(without commit)"
              : "None"
            }`,
            allowedFunctions ? `Allowed Functions: ${allowedFunctions}` : "",
          ].join("\n")}
          color={
            (
              activeChat.db_data_permissions?.type === "Run SQL" ||
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
        jsonbSchemaWithControls={{ variant: "no-labels" }}
      />
      {/* <SmartCardList<DBSSchema["published_methods"]>
        db={dbs as DBHandlerClient}
        showTopBar={{
          insert: {
            buttonProps: {},
            fixedData: {
              connection_id: prgl.connectionId,
            },
          },
        }}
        tableName="published_methods"
        methods={dbsMethods}
        tables={dbsTables}
        excludeNulls={true}
        realtime={true}
        filter={{
          connection_id: prgl.connectionId,
        }}
        fieldConfigs={[
          {
            name: "id",
            hide: true,
          },
          {
            name: "name",
            render: (name, { id }) => {
              const checked = llm_chats_allowed_functions?.some(
                (f) => f.server_function_id === id,
              );
              return (
                <Checkbox
                  variant="header"
                  label={name}
                  checked={llm_chats_allowed_functions?.some(
                    (f) => f.server_function_id === id,
                  )}
                  onChange={() => {
                    if (checked) {
                      dbs.llm_chats_allowed_functions.delete({
                        chat_id: activeChatId,
                        server_function_id: id,
                        connection_id: prgl.connectionId,
                      });
                    } else {
                      dbs.llm_chats_allowed_functions.insert({
                        chat_id: activeChatId,
                        server_function_id: id,
                        connection_id: prgl.connectionId,
                      });
                    }
                  }}
                />
              );
            },
            renderMode: "full",
          },
          {
            name: "description",
          },
        ]}
      /> */}
    </PopupMenu>
  );
};
