import type {
  DeleteParams,
  InsertParams,
  SelectParams,
  UpdateParams,
} from "prostgles-types";
import type { DefineAgenticWorkflow } from "./defineAgenticWorkflow";

export type ProxyDbCallData =
  | {
      type: "db/execute_sql" | "db/execute_readonly_sql";
      sql: string;
      query_timeout?: number;
      query_params?: unknown[] | Record<string, unknown>;
    }
  | ({
      type: "db/find" | "db/count";
      tableName: string;
      filter?: any;
    } & Omit<SelectParams, "abortSignal" | "returnType">)
  | ({
      type: "db/insert" | "db/insertMany";
      tableName: string;
      data: any;
    } & Omit<InsertParams, "returnType">)
  | ({
      type: "db/update";
      tableName: string;
      filter: any;
      data: any;
    } & Omit<UpdateParams, "returnType">)
  | ({
      type: "db/delete";
      tableName: string;
      filter: any;
    } & Omit<DeleteParams, "returnType">);
export type AgenticWorkflowDefinition = Parameters<DefineAgenticWorkflow>[0];
export type ProxyCallDataDefinitions = {
  type: "definitions";
  definitions: Parameters<DefineAgenticWorkflow>[0];
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
      toolName: string;
      serverName: string;
      input: Record<string, unknown> | undefined;
    }
  | {
      type: "progress";
      percent: number;
      message: string;
    }
  | ProxyDbCallData;

const { DOCKER_MCP_ENDPOINT, MODE, USER_INPUT, EXECUTION_MODE } = process.env;
export const WORKFLOW_ENV_VARS = {
  DOCKER_MCP_ENDPOINT,
  MODE,
  USER_INPUT,
  EXECUTION_MODE,
};
