import React from "react";
import type { Prgl } from "../../App";
import { FlexCol } from "../../components/Flex";
import { SmartCodeEditor } from "../CodeEditor/SmartCodeEditor";
import { ProcessLogs } from "./ProcessLogs";

type P = {
  prgl: Prgl;
}

export const TableConfig = ({ prgl: { dbs, connectionId, dbsMethods } }: P) => {
  const { data: dbConf } = dbs.database_configs.useSubscribeOne({ $existsJoined: { connections: { id: connectionId } } });

  if(!dbConf) return null;

  return <FlexCol className="f-1">
    <p className="m-0 p-0">
      Table definitions and lifecycle methods that will be synced to schema
    </p>
    <SmartCodeEditor
      key={"tableConfig"}
      label="Table Config"
      tsLibraries={[{
        filePath: "TableConfig.ts",
        content: TableConfigts,
      }]}
      language="typescript"
      codePlaceholder={exampleConfig}
      value={dbConf.table_config_ts}
      onSave={async (value) => {
        await dbsMethods.setOnMountAndTableConfig?.(connectionId, { table_config_ts: value });
      }}

    />
    <ProcessLogs 
      type="tableConfig"
      connectionId={connectionId}
      dbsMethods={dbsMethods} 
      dbs={dbs} 
    />
  </FlexCol>
}

const TableConfigts = `
type TableConfig = Record<
  string, { 
    /**
     * Column names and sql definitions
     * */
    columns: Record<string, string>; 
  }
>;
`;

const exampleConfig = `/* Example */
export const tableConfig: TableConfig = {
  my_table: {
    columns: {
      some_column: "TEXT",
    },
  },
};

`