import React from "react";
import type { Prgl } from "../../App";
import { FlexCol } from "../../components/Flex";
import { CodeEditorWithSaveButton } from "../CodeEditor/CodeEditorWithSaveButton";
import { ProcessLogs } from "./ProcessLogs";
import { SwitchToggle } from "../../components/SwitchToggle";

type P = {
  prgl: Prgl;
};

export const TableConfig = ({ prgl: { dbs, connectionId, dbsMethods } }: P) => {
  const { data: dbConf } = dbs.database_configs.useSubscribeOne({
    $existsJoined: { connections: { id: connectionId } },
  });

  if (!dbConf) return null;

  return (
    <FlexCol className="f-1">
      <p className="m-0 p-0">
        Table definitions and lifecycle methods that will be synced to schema
      </p>
      <SwitchToggle
        label="Enabled"
        checked={!!dbConf.table_config_ts && !dbConf.table_config_ts_disabled}
        onChange={async (checked) => {
          await dbsMethods.setTableConfig?.(connectionId, {
            table_config_ts_disabled: !checked,
          });
        }}
      />
      <CodeEditorWithSaveButton
        key={"tableConfig"}
        label="Table Config"
        language={{
          lang: "typescript",
          modelFileName: "TableConfig.ts",
          tsLibraries: [
            {
              filePath: "TableConfig.ts",
              content: TableConfigts,
            },
          ],
        }}
        codePlaceholder={exampleConfig}
        value={dbConf.table_config_ts}
        onSave={async (value) => {
          await dbsMethods.setTableConfig?.(connectionId, {
            table_config_ts: value,
            table_config_ts_disabled: !value,
          });
        }}
      />
      <ProcessLogs
        type="tableConfig"
        connectionId={connectionId}
        dbsMethods={dbsMethods}
        dbs={dbs}
      />
    </FlexCol>
  );
};

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

`;
