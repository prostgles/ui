import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject } from "prostgles-types/lib";
import type { DBGeneratedSchema } from "../../../../commonTypes/DBGeneratedSchema";
import type { InstalledPrograms } from "../../../../commonTypes/electronInitTypes";
import type { LLMMessage } from "../../../../commonTypes/llmUtils";
import type { McpToolCallResponse } from "../../../../commonTypes/mcp";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type {
  ConnectionStatus,
  PGDumpParams,
  ProcStats,
  SampleSchema,
} from "../../../../commonTypes/utils";
import type { Connection } from "../../pages/NewConnection/NewConnnectionForm";
import type { FileTableConfigReferences } from "../FileTableControls/FileColumnConfigControls";
import type { ConnectionTableConfig } from "../FileTableControls/FileTableConfigControls";
import type { Backups } from "./dashboardUtils";

export type DBSMethods = Partial<{
  sendFeedback: (feedback: {
    details: string;
    email?: string;
  }) => Promise<void>;
  prostglesSignup: (
    email: string,
    otpCode: string,
  ) => Promise<{ token: string; host: string; hasError?: boolean; error: any }>;
  askLLM: (
    connectionId: string,
    userMessage: LLMMessage["message"],
    schema: string,
    chatId: number,
    type: "new-message" | "approve-tool-use",
  ) => Promise<AnyObject>;
  pgDump: (
    conId: string,
    credId: number | null | undefined,
    dumpParams: PGDumpParams,
  ) => Promise<void>;
  pgRestore: (
    arg1: { bkpId: string; connId?: string },
    opts: Backups["restore_options"],
  ) => Promise<void>;
  streamBackupFile: (
    c: "start" | "chunk" | "end",
    id: null | string,
    conId: string | null,
    chunk: any | undefined,
    sizeBytes: number | undefined,
    opts?: Backups["restore_options"],
  ) => Promise<any>;
  bkpDelete: (bkpId: string, force?: boolean) => Promise<string>;
  getFileFolderSizeInBytes: (conId?: string) => Promise<string>;
  reloadSchema: (conId: string) => Promise<void>;
  startConnection: (conId: string) => Promise<string>;
  testDBConnection: (con: Connection) => Promise<true>;
  deleteConnection: (
    conId: string,
    opts: { dropDatabase: boolean },
  ) => Promise<Connection>;
  createConnection: (
    con: Connection,
    sampleSchemaName?: string,
  ) => Promise<{
    connection: Required<Connection>;
    database_config: DBSSchema["database_configs"];
  }>;
  getDBSize: (conId: string) => Promise<string>;
  getIsSuperUser: (conId: string) => Promise<boolean>;
  validateConnection: (
    con: Connection,
  ) => Promise<{ connection: Required<Connection>; warning?: string }>;
  disconnect: (conId: string) => Promise<boolean>;
  create2FA: () => Promise<{
    url: string;
    secret: string;
    recoveryCode: string;
  }>;
  enable2FA: (confirmationCode: string) => Promise<string>;
  disable2FA: () => Promise<string>;
  setFileStorage: (
    connId: string,
    tableConfig?:
      | ConnectionTableConfig
      | { referencedTables?: FileTableConfigReferences },
    opts?: { keepS3Data?: boolean; keepFileTable?: boolean },
  ) => Promise<any>;
  getConnectedIds: () => Promise<string[]>;
  generateToken: (daysValidity: number) => Promise<string>;
  getMyIP: () => Promise<{ ip: string; isAllowed: boolean }>;
  disablePasswordless: (newAdmin: {
    username: string;
    password: string;
  }) => Promise<void>;
  getNodeTypes: () => {
    filePath: string;
    content: string;
  }[];
  getConnectionDBTypes: (
    conId: string | undefined,
  ) => Promise<string | undefined>;
  getStatus: (conId: string) => Promise<ConnectionStatus>;
  killPID: (
    connId: string,
    id_query_hash: string,
    type: "cancel" | "terminate",
  ) => Promise<any>;
  runConnectionQuery: (
    connId: string,
    query: string,
    args?: AnyObject | any[],
  ) => Promise<AnyObject[]>;
  getSampleSchemas: () => Promise<SampleSchema[]>;
  setOnMount: (
    connId: string,
    changes: Partial<
      Pick<DBSSchema["connections"], "on_mount_ts" | "on_mount_ts_disabled">
    >,
  ) => Promise<void>;
  setTableConfig: (
    connId: string,
    changes: Partial<
      Pick<
        DBSSchema["database_configs"],
        "table_config_ts" | "table_config_ts_disabled"
      >
    >,
  ) => Promise<void>;
  getForkedProcStats: (connId: string) => Promise<{
    server: {
      mem: number;
      freemem: number;
    };
    methodRunner: ProcStats | undefined;
    onMountRunner: ProcStats | undefined;
    tableConfigRunner: ProcStats | undefined;
  }>;
  getInstalledPsqlVersions: () => Promise<InstalledPrograms>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  installMCPServer: (serverName: string) => Promise<void>;
  getMCPServersStatus: (serverName: string) => Promise<{
    ok: boolean;
    error?: string;
    message: string;
  }>;
  callMCPServerTool: (
    chat_id: number,
    serverName: string,
    toolName: string,
    args: any,
  ) => Promise<McpToolCallResponse>;
  reloadMcpServerTools: (serverName: string) => Promise<number>;
  getMcpHostInfo: () => Promise<{
    os: string;
    npmVersion: string;
    uvxVersion: string;
  }>;
  refreshModels: () => Promise<void>;
}>;

const AdminTableNames = ["connections", "global_settings"] as const;

export type DBS = DBHandlerClient<DBGeneratedSchema> & {
  sql: DBHandlerClient["sql"];
};

type AsOptional<T, Keys extends keyof Partial<T> & string> = Omit<T, Keys> & {
  [K in Keys]?: Partial<T[K]>;
};

export type DbsByUserType = AsOptional<DBS, (typeof AdminTableNames)[number]>;
