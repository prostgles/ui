import { tableOptionsJsonbSchema } from "@common/mcp/tableOptionsJsonbSchema";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { getJSONBSchemaAsJSONSchema } from "prostgles-types";
import React, { useMemo } from "react";
import { CodeEditorWithSaveButton } from "src/dashboard/CodeEditor/CodeEditorWithSaveButton";

export const TableDisplayOptionsJSON = ({
  tableName,
}: {
  tableName: string;
}) => {
  const { dbsTables, dbs, connection } = usePrgl();
  const connectionTable = dbsTables.find((t) => t.name === "connections");

  const languageOrError = useMemo(() => {
    if (!connectionTable) {
      return "Error: connections table not found";
    }
    const tableOptionsColumn = connectionTable.columns.find(
      (c) => c.name === "table_options",
    );
    if (!tableOptionsColumn || !tableOptionsColumn.jsonbSchema) {
      return "Error: table_options column not found";
    }

    const schema = getJSONBSchemaAsJSONSchema(
      connectionTable.name,
      tableOptionsColumn.name,
      tableOptionsJsonbSchema.record.values,
    );

    return {
      lang: "json",
      jsonSchemas: [
        {
          id: "displayOptionsSchema",
          schema,
        },
      ],
    } as const;
  }, [connectionTable]);

  if (typeof languageOrError === "string") {
    return <div className="p-p25">{languageOrError}</div>;
  }
  return (
    <CodeEditorWithSaveButton
      label="Display options JSON"
      language={languageOrError}
      value={JSON.stringify(
        connection.table_options?.[tableName] ?? {},
        null,
        2,
      )}
      onSave={async (newValue) => {
        await dbs.connections.update(
          { id: connection.id },
          {
            table_options: {
              $merge: [
                {
                  [tableName]: JSON.parse(newValue) as unknown,
                },
              ],
            },
          },
        );
      }}
    />
  );
};
