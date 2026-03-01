type AnyObject = Record<string, any>;

type PrimitiveType = "string" | "number" | "boolean" | "unknown";

type PrimitiveTypeWithArraysAndOptional = {
  type: PrimitiveType | `${PrimitiveType}[]`;
  optional?: boolean;
};
export type PropertyType =
  | PrimitiveTypeWithArraysAndOptional
  /** Object */
  | {
      type: Record<string, PrimitiveTypeWithArraysAndOptional>;
      optional?: boolean;
    }
  /** Array of objects */
  | {
      arrayOfType: Record<string, PrimitiveTypeWithArraysAndOptional>;
      optional?: boolean;
    };

export type AgentDefinition<ToolNames extends string[]> = {
  prompt: string;
  modelName?: string;
  maxCostUSD?: number;
  maxIterations?: number;
  allowedToolDefinitionNames?: ToolNames;
  maxTokens?: number;
  temperature?: number;
  outputSchema: Record<string, PropertyType>;
};

type PrimitiveMap = {
  string: string;
  number: number;
  boolean: boolean;
  null: null;
  undefined: undefined;
  unknown: unknown;
};

type ParsePrimitive<S extends string> =
  S extends keyof PrimitiveMap ? PrimitiveMap[S] : never;

type ParseUnion<S extends string> =
  S extends `${infer L} | ${infer R}` ? ParsePrimitive<L> | ParseUnion<R>
  : ParsePrimitive<S>;

type ParsePropertyType<S extends PropertyType> =
  S extends `${infer Inner}[]` ? ParseUnion<Inner & string>[]
  : ParseUnion<S & string>;

type ParseSchema<S extends Record<string, PropertyType>> = {
  [K in keyof S]: ParsePropertyType<S[K]>;
};

export type ToolDefinition = {
  mcpServerName: string;
  toolNames: string[];
};

/**
 * Valid table name from existing tables or to be created from tableCreateStatements.
 * Iregular table names must contain the double quotes (quote_ident(tableName) result)
 */
type TableName = string;

/**
 * A filter for a table, defined as a MongoDB-like query object.
 * Supported operators:
 * - Comparison: $eq, $ne, $gt, $gte, $lt, $lte
 * - Logical: $and, $or
 * - Evaluation: $like, $ilike
 * - Array: $in, $nin
 * - Joins: $existsJoined: { [tableName]: TableFilter }
 * @example
 * {
      $and: [
        { 
          $or: [
            { topic: { $in: ["Prostgles", "Postgres"] } },
            { summary: { $ilike: "%postgres%" } },
            { id: { $gt: 5 } },
          ]
        },
        { summary: { $ne: null } }
      ]
    }
 */
type TableFilter = Record<string, unknown>;

type DetailedTableFilter = {
  fieldName: string;
  /**
   * Defaults to $eq
   */
  type?:
    | "$ilike"
    | "$like"
    | "$nilike"
    | "$nlike"
    | "$between"
    | "$gt"
    | "$gte"
    | "$lt"
    | "$lte"
    | "$eq"
    | "$ne"
    | "$in"
    | "$nin"
    | "@@.to_tsquery"
    | "@@.plainto_tsquery"
    | "@@.phraseto_tsquery"
    | "@@.websearch_to_tsquery";
  value: unknown;
};
type DetailedTableFilterGroup =
  | { $and: DetailedTableFilter[] }
  | { $or: DetailedTableFilter[] };

/**
 * Defines a list of columns with either 1 (include) or 0 (exclude).
 */
type FieldFilter = "*" | Record<string, 1> | Record<string, 0>;

export type DatabaseAccessDefinition =
  | {
      mode: "custom";
      /**
       * An sql statement that creates custom tables the agent will interact with.
       * Permissions for these tables can be defined in `tablePermissions`.
       * This is preferred over providing access to the entire database (execute_sql_with_commit mode) for better security.
       */
      tableCreateStatements?: string;
      /**
       * Defines the tables, columns and rows the agent can access. Only applicable if mode is "custom".
       * The keys of the tablePermissions object must be the table names as they appear in the database, or as they will be created from tableCreateStatements.
       * For irregular table names, the keys must contain the double quotes (quote_ident(tableName) result).
       */
      tablePermissions: Record<
        TableName,
        {
          select?:
            | true
            | {
                /**
                 * Fields that can be selected. Use "*" to allow all fields
                 */
                fields: FieldFilter;
                /**
                 * Conditions that must be met for a row to be selected.
                 * This is applied in addition to any filter provided in the find/count methods, and cannot be overridden
                 */
                forcedFilter?: DetailedTableFilterGroup;
              };
          insert?:
            | true
            | {
                /**
                 * Fields that can be inserted into. Use "*" to allow all fields.
                 */
                fields: FieldFilter;
              };
          update?:
            | true
            | {
                /**
                 * Fields that can be updated. Use "*" to allow all fields.
                 */
                fields: FieldFilter;
                forcedFilter?: DetailedTableFilterGroup;
              };
          delete?:
            | true
            | {
                forcedFilter?: DetailedTableFilterGroup;
              };
        }
      >;
    }
  | {
      mode: "execute_sql_with_commit" | "execute_sql_with_rollback";
    };

type Select = "*" | Record<string, 1 | 0>;
export type DatabaseHandler = {
  /**
   * The table handlers below are only available if databaseAccessDefinitions are defined
   * Must provide the correct data type in filters (do not provide a boolean if the column is a string, etc.)
   */

  count: (tableName: string, filter?: TableFilter) => Promise<number>;
  find: (
    tableName: TableName,
    filter?: TableFilter,
    options?: {
      select?: Select;
      limit?: number;
      orderBy?: Record<string, 1 | -1>[];
    },
  ) => Promise<AnyObject[]>;

  /** Must define "returning" to get anything back */
  update: (
    tableName: TableName,
    filter: TableFilter,
    update: Record<string, any>,
    returning?: Select,
  ) => Promise<void | AnyObject[]>;
  insert: (
    tableName: TableName,
    newRows: Record<string, any>[],
    returning?: Select,
  ) => Promise<void | AnyObject[]>;
  delete: (
    tableName: TableName,
    filter: TableFilter,
    returning?: Select,
  ) => Promise<void | AnyObject[]>;

  /**
   * Runs a raw SQL query.
   * Prefer to use the table handlers above when possible, as they are safer.
   * Only available if databaseAccessDefinitions.mode is "execute_sql_with_commit" or "execute_sql_with_rollback".
   */
  runSQL: (
    sql: string,
    params?: Record<string, any> | any[],
    timeout?: number,
  ) => Promise<Record<string, unknown>[]>;
};

type UserInputBase<T> = T & {
  title: string;
  optional?: boolean;
};

export type UserInputItem =
  | UserInputBase<{
      type: "table-filter" | "table-column";
      tableName: string;
    }>
  | UserInputBase<{
      type: "table-name" | "table-and-column";
    }>
  | UserInputBase<{
      type: "custom";
      dataType: "string" | "number" | "boolean" | "Date";
    }>;

export type UserInputOutputMapping = {
  "table-filter": Record<string, any>;
  "table-and-column": { tableName: string; columnName: string };
  "table-name": string;
  "table-column": string;
  custom: unknown;
};

export type ValueOfUserInput<UserInput extends Record<string, UserInputItem>> =
  {
    [InputName in keyof UserInput]?: UserInputOutputMapping[UserInput[InputName]["type"]];
  };

export type DefineAgenticWorkflow = <
  ToolDefinitions extends Record<string, ToolDefinition>,
  WorkflowAllowedTools extends Record<string, Record<string, 1>>,
  AgentDefinitions extends Record<
    string,
    AgentDefinition<(keyof ToolDefinitions & string)[]>
  >,
  UserInput extends Record<string, UserInputItem>,
>(
  {
    name,
    timeOutInSeconds,
    toolDefinitions,
    databaseAccessDefinitions,
    agentDefinitions,
    userInput,
  }: {
    name: string;
    timeOutInSeconds: number;
    userInput?: UserInput;
    databaseAccessDefinitions?: DatabaseAccessDefinition;
    toolDefinitions?: ToolDefinitions;
    workflowAllowedTools?: WorkflowAllowedTools;
    agentDefinitions: AgentDefinitions;
  },
  workflow: (
    agentHandlers: {
      [AgentName in keyof AgentDefinitions]: (
        agentInput?: string,
      ) => Promise<ParseSchema<AgentDefinitions[AgentName]["outputSchema"]>>;
    },
    databaseHandler: DatabaseHandler,
    workflowToolHandlers: {
      [WorkflowMcpServerName in keyof WorkflowAllowedTools]: {
        [ToolName in keyof WorkflowAllowedTools[WorkflowMcpServerName]]: (
          toolArguments?: unknown,
        ) => Promise<unknown>;
      };
    },
    userInputValues: ValueOfUserInput<UserInput>,
    setProgress: (progressPercent: number, message?: string) => Promise<void>,
  ) => Promise<void>,
) => void | Promise<void>;

/**
 * Example usage:
 * 
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
void defineAgenticWorkflow(
  {
    name: "Test Workflow",
    timeOutInSeconds: 60,
    databaseAccessDefinitions: {
      mode: "custom",
      tablePermissions: {
        '"MyUsers"': { select: true, insert: true, update: true },
        my_research_topics: { select: true, insert: true, update: true },
      },
      tableCreateStatements: `
        CREATE TABLE IF NOT EXISTS my_research_topics (
          id SERIAL PRIMARY KEY,
          topic TEXT NOT NULL,
          summary TEXT,
          references TEXT[]
        );
      `,
    },
    toolDefinitions: {
      fetchWebpage: {
        mcpServerName: "fetch",
        toolNames: ["fetch_webpage"],
      },
      getUsers: {
        mcpServerName: "database",
        toolNames: ["select"],
      },
    },
    agentDefinitions: {
      researcher: {
        prompt: "You are a research assistant.",
        allowedToolNames: ["fetchWebpage", "getUsers"],
        outputSchema: {
          summary: { type: "string" },
          references: { type: "string[]" },
        },
      },
    },
  },
  async ({ researcher }, db) => {

    const doResearch = async () => {
      const result = await researcher(`research_topic: "Prostgles"`);
      await db.insert("my_research_topics", [
        {
          topic: "Prostgles",
          summary: result.summary,
          references: result.references,
        },
      ]);
    }
    await doResearch();
    
    const finalTopics = await db.find("my_research_topics", {
      $and: [
        { 
          $or: [
            { topic: { $in: ["Prostgles", "Postgres"] } },
            { summary: { $ilike: "%postgres%" } },
            { id: { $gt: 5 } },
          ]
        },
        { summary: { $ne: null } }
      ]
    });

    if(finalTopics.length < 10) {
      await doResearch();
    }
  },
);

 */

export const END_OF_SCHEMA_PLACEHOLDER =
  "export const END_OF_SCHEMA_PLACEHOLDER =";

export { defineAgenticWorkflow } from "./defineAgenticWorkflowHandlers";
