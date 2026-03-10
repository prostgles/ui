import type { DefineAgenticWorkflow } from "./defineAgenticWorkflow";

export type ProxyDbCallData =
  | {
      type: "db/execute_sql_with_commit" | "db/execute_sql_with_rollback";
      sql: string;
      query_timeout?: number;
      query_params?: unknown[] | Record<string, unknown>;
    }
  | {
      type: "db/find" | "db/count";
      tableName: string;
      filter?: any;
      limit?: any;
      select?: any;
      orderBy?: any;
      offset?: any;
    }
  | {
      type: "db/insert";
      tableName: string;
      data: any;
      returning?: any;
      onConflict?: any;
    }
  | {
      type: "db/update";
      tableName: string;
      filter: any;
      data: any;
      returning?: any;
      onConflict?: any;
    }
  | {
      type: "db/delete";
      tableName: string;
      filter: any;
      returning?: any;
    };
export type AgenticWorkflowDefinition = Parameters<DefineAgenticWorkflow>[0];
export type ProxyCallDataDefinitions = {
  type: "definitions";
  definitions: Parameters<DefineAgenticWorkflow>[0];
  newTables: {
    name: string;
    schema?: string;
    columns: {
      name: { name: string };
      dataType: { name: string };
      constraints?: { type: "primary key" | "not null" }[];
    }[];
    ifNotExists?: boolean;
  }[];
  usedTables: string[];
};
export type ProxyCallData =
  | ProxyCallDataDefinitions
  | {
      type: "agent";
      agentName: string;
      input: string;
    }
  | {
      type: "tool";
      name: string;
      input: Record<string, unknown> | undefined;
    }
  | {
      type: "progress";
      percent: number;
      message: string;
    }
  | ProxyDbCallData;

const { DOCKER_MCP_ENDPOINT, MODE, USER_INPUT } = process.env;
export const WORKFLOW_ENV_VARS = {
  DOCKER_MCP_ENDPOINT,
  MODE,
  USER_INPUT,
};
