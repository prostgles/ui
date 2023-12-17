import { useSubscribeOne } from 'prostgles-client/dist/react-hooks';
import React from 'react';
import { Prgl } from '../../App';
import { FlexCol } from '../../components/Flex';
import { InfoRow } from '../../components/InfoRow';
import { FooterButtons } from '../../components/Popup/FooterButtons';
import CodeEditor from '../CodeEditor';

type P = {
  prgl: Prgl;
}

export const TableConfig = ({ prgl: {dbs, connectionId, dbsMethods} }: P) => {
  const dbConf = useSubscribeOne(dbs.database_configs.subscribeOneHook({ $existsJoined: { connections: { id: connectionId } } }));
    
  const [localTableConfigTs, setLocalTableConfigTs] = React.useState(dbConf?.table_config_ts);

  const didChange = localTableConfigTs !== dbConf?.table_config_ts;

  if(!dbConf) return null;

  return <FlexCol className="f-1">
    <InfoRow>Table definitions and lifecycle methods that will be synced to schema</InfoRow>
    <CodeEditor
      tsLibraries={[{
        content: TableConfigts,
        path: "TableConfig.ts"
      }]}
      language="typescript"
      value={localTableConfigTs ?? dbConf?.table_config_ts ?? ""}
      onChange={(value) => {
        setLocalTableConfigTs(value)
      }}
    />
    {didChange && <FooterButtons
      footerButtons={[
        {
          label: "Cancel",
        },
        {
          label: "Save",
          color: "action",
          variant: "filled",
          onClickPromise: async () => {
            await dbs.database_configs.update({ id: dbConf.id }, { table_config_ts: localTableConfigTs });
          }
        }
      ]}
    />}
  </FlexCol>
}

const TableConfigts = `
type TableConfig = Record<
  string, { 
    /**
     * Column names and sql definitions
     * */
    columns: Record<string, string>; 
    /**
     * Function that will be called after the table is created and server started or schema changed
     */
    onMount?: (params: { dbo: any; db: any }) => Promise<void | { onUnmount: () => Promise<void> }>; 
  }
>;
`;

