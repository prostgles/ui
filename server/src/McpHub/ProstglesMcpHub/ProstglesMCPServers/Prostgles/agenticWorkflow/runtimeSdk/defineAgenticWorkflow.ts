import { TableHandler } from "prostgles-types";

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

/**
 * Use get_tool_schemas tool to get the full definitions of mcp functions that go into McpServerToolDefinitions
 */
type McpServerToolDefinitions = Record<
  string,
  Record<string, (toolArguments?: unknown) => Promise<unknown>>
>;
// type McpServerToolDefinitions = {
//   web: {
//     fetch_webpage: (args: { url: string }) => Promise<{ content: string }>;
//   };
//   web: {
//     search: (args: { q: string }) => Promise<{ results: string[] }>;
//     get_snapshot: (args: { url: string }) => Promise<{ snapshot: string }>;
//   };
// };
//EndOfReplaceMcpServerToolDefinitions;

export type DBGeneratedSchema = Record<
  string,
  { columns: Record<string, any> }
>; //EndOfDBGeneratedSchema;

/**
 * Defines which tools can be used.
 *
 * Here for example we allow the "status" tool from the "github" MCP server:
 * @example
 * {
 *    github: {
 *      status: 1
 *    }
 * }
 */
export type McpServerToolsAllowed = {
  [McpServerName in keyof McpServerToolDefinitions]?: {
    [ToolName in keyof McpServerToolDefinitions[McpServerName]]?: 1;
  };
};

export type AgentDefinition = {
  prompt: string;
  modelName?: string;
  maxCostUSD?: number;
  maxIterations?: number;
  tools?: McpServerToolsAllowed;
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

type ParsePropertyType<P extends PropertyType> =
  P extends PrimitiveTypeWithArraysAndOptional ? ParsePrimitiveField<P>
  : P extends (
    {
      type: infer Obj extends Record<
        string,
        PrimitiveTypeWithArraysAndOptional
      >;
    }
  ) ?
    ParseObjectFields<Obj>
  : P extends (
    {
      arrayOfType: infer Obj extends Record<
        string,
        PrimitiveTypeWithArraysAndOptional
      >;
    }
  ) ?
    ParseObjectFields<Obj>[]
  : never;

type ParsePrimitiveField<T extends PrimitiveTypeWithArraysAndOptional> =
  T["type"] extends `${infer Inner}[]` ? ParseUnion<Inner & string>[]
  : ParseUnion<T["type"] & string>;

type ParseObjectFields<
  T extends Record<string, PrimitiveTypeWithArraysAndOptional>,
> = {
  [K in keyof T]: ParsePrimitiveField<T[K]>;
};

type ParseSchema<S extends Record<string, PropertyType>> = {
  [K in keyof S]: ParsePropertyType<S[K]>;
};

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

export const ALLOWED_DDL_STATEMENT_TYPES = [
  "alter table",
  "create index",
  "create table",
  "create view",
] as const;

export type DatabaseAccessDefinition =
  | {
      mode: "custom";
      /**
       * An sql statement that creates/alters tables the agent will interact with.
       * Permissions for these tables MUST be defined in `tablePermissions`.
       * This is preferred over providing access to the entire database (execute_sql mode) for better security.
       * Only ALLOWED_DDL_STATEMENT_TYPES are allowed.
       */
      ddlStatements?: string;
      /**
       * Defines the tables, columns and rows the agent can access. Only applicable if mode is "custom".
       * The keys of the tablePermissions object must be the table names as they appear in the database, or as they will be created from ddlStatements.
       * For irregular table names, the keys must contain the double quotes (quote_ident(tableName) result).
       * Use "true" to allow all fields/filters for a command, or provide a more specific definition for better security.
       * Avoid writing more rule info than necessary. For example, to allow selectingn all fields from all data just use "select: true" instead of defining all the fields and using "select: { fields: "*" }".
       */
      tablePermissions: Record<
        /**
         * keyof DBGeneratedSchema or new table names from ddlStatements
         * */
        string,
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
      mode: "execute_sql" | "execute_readonly_sql";
    };

type DbTableHandler = {
  [TableName in keyof DBGeneratedSchema]: TableHandler<
    DBGeneratedSchema[TableName]["columns"],
    DBGeneratedSchema
  >;
};

/**
 * The table handlers below are only available if databaseAccessDefinitions are defined
 * Must provide the correct data type in filters (do not provide a boolean if the column is a string, etc.)
 *
 * @example
 * db.my_table.find({ name: "John", age: { $gt: 30 } }, { orderBy: { key: "created", asc: false, nulls: "last" }, limit: 20, select: { id: 1, name: 1 } });
 * db.my_table.insert({ email: "john@gmail.com", name: "John", age: 35 }, { returning: "*", onConflict: "DoUpdate" }); // Will update all non conflicting fields
 * db.my_table.insert({ email: "john@gmail.com", name: "John", age: 35 }, { returning: { email: 1 }, onConflict: "DoNothing" });
 * db.my_table.insert({ name: "John", age: 35 }, { returning: { id: 1 } });
 * db.my_table.update({ name: "John" }, { age: 36 }, { returning: { id: 1 } });
 * db.my_table.delete({ age: { $lt: 20 } }, { returning: "*" });
 *
 * A filter is defined as a MongoDB-like query object.
 * Supported operators:
 * - Comparison: $eq, $ne, $gt, $gte, $lt, $lte
 * - Logical: $and, $or
 * - Evaluation: $like, $ilike
 * - Array: $in, $nin
 * - Joins: $existsJoined: { [tableName]: TableFilter }
 * For Example:
 * {
 *   $and: [
 *     {
 *       $or: [
 *         { topic: { $in: ["Prostgles", "Postgres"] } },
 *         { summary: { $ilike: "%postgres%" } },
 *         { id: { $gt: 5 } },
 *       ]
 *     },
 *     { summary: { $ne: null } }
 *   ]
 * }
 *
 * A table select definition is either "*" to select all fields, or an object with the field names as keys and 1 as values (to select) or 0 to exclude.
 *
 * {
 *   field1: 1,
 *   field2: 1,
 *   referencedTable: "*", // all fields from the referenced table will be included in an array under the "referencedTable" key
 * }
 *
 * */
type TableHandlers<
  AccessMode extends DatabaseAccessDefinition["mode"] | undefined,
> =
  AccessMode extends "custom" | "execute_sql" | "execute_readonly_sql" ?
    DbTableHandler
  : never;

/**
 * Runs a raw SQL query.
 * Prefer to use the table handlers above when possible, as they are safer.
 * Only available if databaseAccessDefinitions.mode is "execute_sql" or "execute_readonly_sql".
 */
type SqlHandler<
  AccessMode extends DatabaseAccessDefinition["mode"] | undefined,
> =
  AccessMode extends "execute_sql" | "execute_readonly_sql" ?
    (
      sql: string,
      params?: Record<string, any> | any[],
      timeout?: number,
    ) => Promise<Record<string, unknown>[]>
  : never;

type UserInputBase<T> = T & {
  title: string;
  optional?: boolean;
};

/**
 * Prefer to use this over "custom" or "enum" to restrict the input and make it easier for the user to choose the correct value.
 */
export type UserInputItem =
  | UserInputBase<{
      /**
       * A path to a file/folder from the local system that will be mounted to the container.
       * The agent can read and write depending on the accessMode value.
       */
      type: "folder-path" | "file-path" | "file-or-folder-path";
      accessMode: "read" | "read-write";
    }>
  | UserInputBase<{
      /**
       * Same as above but allows multiple paths to be provided. The agent will receive an array of paths.
       */
      type: "folder-paths" | "file-paths" | "file-or-folder-paths";
      accessMode: "read" | "read-write";
    }>
  | UserInputBase<{
      type: "table-column-value";
      tableName: string;
      columnName: string;
      defaultValue?: any;
    }>
  | UserInputBase<{
      type: "table-column-values";
      tableName: string;
      columnName: string;
      defaultValue?: any[];
    }>
  | UserInputBase<{
      type: "enum";
      values: string[];
      defaultValue?: string;
    }>
  | UserInputBase<{
      type: "table-filter";
      tableName: string;
      defaultValue?: Record<string, any>;
    }>
  | UserInputBase<{
      type: "table-column";
      tableName: string;
      defaultValue?: string;
    }>
  | UserInputBase<{
      type: "table-name";
      defaultValue?: string;
    }>
  | UserInputBase<{
      type: "table-and-column";
      defaultValue?: { tableName: string; columnName: string };
    }>
  | UserInputBase<{
      type: "custom";
      dataType: "string" | "number" | "boolean" | "Date";
      defaultValue?: unknown;
    }>;

export type UserInputOutputMapping = {
  "table-filter": Record<string, any>;
  "table-and-column": { tableName: string; columnName: string };
  "table-column-value": unknown;
  "table-column-values": unknown[];
  "table-name": string;
  "table-column": string;
  "folder-path": string;
  "file-or-folder-path": string;
  "file-path": string;
  "folder-paths": string[];
  "file-or-folder-paths": string[];
  "file-paths": string[];
  enum: string;
  custom: unknown;
};

type OptionalInputKeys<U extends Record<string, UserInputItem>> = {
  [K in keyof U]-?: U[K] extends { optional: true } ? K : never;
}[keyof U];

type RequiredInputKeys<U extends Record<string, UserInputItem>> = Exclude<
  keyof U,
  OptionalInputKeys<U>
>;

export type ValueOfUserInput<U extends Record<string, UserInputItem>> = {
  [K in RequiredInputKeys<U>]: UserInputOutputMapping[U[K]["type"]];
} & {
  [K in OptionalInputKeys<U>]?: UserInputOutputMapping[U[K]["type"]];
};

export type DefineAgenticWorkflow = <
  OrchestrationTools extends McpServerToolsAllowed,
  AgentDefinitions extends Record<string, AgentDefinition>,
  UserInput extends Record<string, UserInputItem>,
  DatabaseAccess extends DatabaseAccessDefinition | undefined = undefined,
>(
  {
    name,
    containerConfiguration,
    databaseAccessDefinitions,
    agentDefinitions,
    userInput,
  }: {
    name: string;
    containerConfiguration: {
      /**
       * Maximum time in seconds the container will be allowed to run in milliseconds.
       * Defaults to 30000.
       */
      timeout: number;
      /**
       * CPU limit (e.g., '0.5', '1'). Defaults to 1
       */
      cpus?: string;
      /**
       * Memory limit (e.g., '512m', '1g'). Defaults to 512m
       */
      memory?: string;
      environment?: Record<string, string>;
      /**
       * Whether to mount the filesystem as read-only. Defaults to true
       */
      readOnly?: boolean;
      /**
       * Whether the container should have access to the internet.
       * Defaults to 'none'.
       * 'bridge' provides access to the internet through NAT, which is more secure than 'host' but may not work for all use cases.
       * Do not use 'host' unless it is strictly necessary, as it can be a security risk.
       */
      internetAccess?: "none" | "bridge" | "host";
    };
    userInput?: UserInput;
    databaseAccessDefinitions?: DatabaseAccess;
    orchestrationTools?: OrchestrationTools;
    agentDefinitions?: AgentDefinitions;
  },
  workflow: (args: {
    tableHandlers: TableHandlers<
      DatabaseAccess extends { mode: infer M } ? M : undefined
    >;
    runSQL: SqlHandler<
      DatabaseAccess extends { mode: infer M } ? M : undefined
    >;
    agentHandlers: AgentDefinitions extends Record<string, AgentDefinition> ?
      {
        [AgentName in keyof AgentDefinitions]: (
          agentInput?: string,
        ) => Promise<ParseSchema<AgentDefinitions[AgentName]["outputSchema"]>>;
      }
    : undefined;
    orchestratorToolHandlers: {
      [ServerName in keyof OrchestrationTools]: {
        [ToolName in keyof OrchestrationTools[ServerName]]: ServerName extends (
          keyof McpServerToolDefinitions
        ) ?
          ToolName extends keyof McpServerToolDefinitions[ServerName] ?
            McpServerToolDefinitions[ServerName][ToolName]
          : never
        : never;
      };
    };
    userInputValues: ValueOfUserInput<UserInput>;
    setProgress: (progressPercent: number, message?: string) => Promise<void>;
  }) => Promise<void>,
) => void | Promise<void>;

/**
 * Example usage:
 * 
import { defineAgenticWorkflow } from "./defineAgenticWorkflow";
void defineAgenticWorkflow(
  {
    name: "Test Workflow",
    containerConfiguration: { timeout: 60_000 },
    databaseAccessDefinitions: {
      mode: "custom",
      tablePermissions: {
        '"MyUsers"': { select: true, insert: true, update: true },
        my_research_topics: { select: true, insert: true, update: true },
      },
      ddlStatements: `
        CREATE TABLE IF NOT EXISTS my_research_topics (
          id SERIAL PRIMARY KEY,
          topic TEXT NOT NULL,
          summary TEXT,
          references TEXT[]
        );
      `,
    },
    orchestrationTools: {
      web: { search: 1, get_snapshot: 1 },
    },
    agentDefinitions: {
      researcher: {
        prompt: "You are a research assistant.",
        tools: { web: { fetch: 1 } },
        outputSchema: {
          summary: { type: "string" },
          references: { type: "string[]" },
        },
      },
    },
    userInput: {
      documentsFolder: {
        title: "Documents Folder",
        type: "folder-path",
        accessMode: "read-write",
      }
    }
  },
  async ({ agentHandlers: { researcher }, tableHandlers, orchestrationTools: { web } }) => {

    const doResearch = async () => {
      const result = await researcher(`research_topic: "Prostgles"`);
      await tableHandlers.my_research_topics.insert({
        topic: "Prostgles",
        summary: result.summary,
        references: result.references,
      });
    }
    await doResearch();
    
    const finalTopics = await tableHandlers.my_research_topics.find({
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

    await web.search({ q: "Prostgles" });
  },
);

 */

export const END_OF_SCHEMA_PLACEHOLDER =
  "export const END_OF_SCHEMA_PLACEHOLDER =";

export { defineAgenticWorkflow } from "./defineAgenticWorkflowHandlers";
