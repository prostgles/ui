import { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { DBSchemaGenerated } from "../../../../commonTypes/DBoGenerated";
import { ConnectionStatus, PGDumpParams } from "../../../../commonTypes/utils";
import { Connection } from "../../pages/NewConnection/NewConnnection";
import { FileTableConfigReferences } from "../FileTableControls/FileColumnConfigControls";
import { ConnectionTableConfig } from "../FileTableControls/FileTableConfigControls";
import { Backups } from "./dashboardUtils";
import { AnyObject } from "prostgles-types/lib";
import { DBSSchema } from "../../../../commonTypes/publishUtils";

export type DBSMethods = Partial<{
  pgDump: (conId: string, credId: number | null | undefined, dumpParams: PGDumpParams) => Promise<void>;
  pgRestore: (arg1: { bkpId: string; connId?: string }, opts: Backups["restore_options"]) => Promise<void>;
  streamBackupFile: (c: "start" | "chunk" | "end", id: null | string, conId: string | null, chunk: any | undefined, sizeBytes: number | undefined, opts?: Backups["restore_options"]) => Promise<any>
  bkpDelete: (bkpId: string, force?: boolean) => Promise<string>;
  getFileFolderSizeInBytes: (conId?: string) => Promise<string>;
  reloadSchema: (conId: string) => Promise<void>;
  startConnection: (conId: string) => Promise<string>;
  testDBConnection: (con: Connection) => Promise<true>;
  deleteConnection: (conId: string, opts: { dropDatabase: boolean }) => Promise<Connection>;
  createConnection: (con: Connection) => Promise<{ connection: Required<Connection>; database_config: DBSSchema["database_configs"] }>;
  getDBSize: (conId: string) => Promise<string>;
  getIsSuperUser: (conId: string) => Promise<boolean>;
  validateConnection: (con: Connection) => Promise<{ connection: Required<Connection>; warning?: string }>;
  disconnect: (conId: string) => Promise<boolean>;
  create2FA: () => Promise<{ url: string; secret: string; recoveryCode: string; }>;
  enable2FA: (confirmationCode: string) => Promise<string>;
  disable2FA: () => Promise<string>;
  setFileStorage: (connId: string, tableConfig?: ConnectionTableConfig | { referencedTables?: FileTableConfigReferences }, opts?: { keepS3Data?: boolean; keepFileTable?: boolean }) => Promise<any>;
  setTableConfig: (connId: string, tableConfig: DBSSchema["database_configs"]["table_config"] | undefined) => Promise<void>;
  getConnectedIds: () => Promise<string[]>;
  generateToken: (daysValidity: number) => Promise<string>;
  getMyIP: () => Promise<{ ip: string; isAllowed: boolean; }>;
  disablePasswordless: (newAdmin: {
    username: string;
    password: string;
  }) => Promise<void>;
  getAPITSDefinitions: () => {
    name: string;
    path: string;
    content: string;
  }[];
  getConnectionDBTypes: (conId: string) => string | undefined;
  makeFakeData: (conId: string) => string | undefined;
  getStatus: (conId: string) => Promise<ConnectionStatus>;
  killPID: (connId: string, id_query_hash: string, type: "cancel" | "terminate") => Promise<any>;
  runConnectionQuery: (connId: string, query: string, args?: AnyObject | any[]) => Promise<AnyObject[]>;
  getSampleSchemas: () => Promise<{ name: string; file: string; type: "sql" | "ts" }[]>;
  getCompiledTS: (ts: string) => Promise<string>;
}>;

export type DBS = DBHandlerClient<DBSchemaGenerated> & {
  sql: DBHandlerClient["sql"];
}
