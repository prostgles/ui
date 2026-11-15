import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { mdiChatOutline } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { isEqual, type AnyObject, type DBSchemaTable } from "prostgles-types";
import React from "react";
import { useLLMSetup } from "src/dashboard/AskLLM/Setup/LLMSetupProvider";

export const ActionColumnChats = ({
  row,
  table,
  onOpen,
}: {
  row: AnyObject;
  table: DBSchemaTable;
  onOpen: VoidFunction;
}) => {
  const { dbs, connectionId } = usePrgl();
  const { setShowChat } = useLLMSetup();
  const { data: chats, error } = dbs.llm_chats.useSubscribe(
    {
      connection_id: connectionId,
      agent_info: {
        "@>": {
          type: "agent",
          relatedRecord: { tableName: table.name, rowParts: [] },
        },
      },
    },
    {
      select: { id: 1, name: 1, created: 1, agent_info: 1 },
      orderBy: { created: -1 },
    },
  );
  const relatedChats = chats?.filter(
    ({ agent_info }) =>
      agent_info?.type === "agent" &&
      agent_info.relatedRecord?.rowParts.some((rowPart) => {
        // Prefer stable identity columns over other values captured before the action ran.
        const identity = table.uniqueColumnGroups?.find(
          (columns) =>
            columns.length &&
            columns.every(
              (column) => rowPart[column] != null && row[column] != null,
            ),
        );
        const columns = identity ?? Object.keys(rowPart);
        return (
          columns.length &&
          columns.every((column) => isEqual(rowPart[column], row[column]))
        );
      }),
  );

  return (
    <section className="flex-col gap-p5 mt-1" aria-label="Related agent chats">
      <h4 className="m-0">Related agent chats</h4>
      <ErrorComponent error={error} />
      {!error && !chats && <span>Loading chats...</span>}
      {relatedChats?.length === 0 && <span>No related agent chats</span>}
      {relatedChats?.map((chat) => (
        <Btn
          key={chat.id}
          iconPath={mdiChatOutline}
          variant="faded"
          title={new Date(chat.created).toLocaleString()}
          onClick={() => {
            onOpen();
            setShowChat({ selectedChatId: chat.id });
          }}
        >
          {chat.name}
        </Btn>
      ))}
    </section>
  );
};
