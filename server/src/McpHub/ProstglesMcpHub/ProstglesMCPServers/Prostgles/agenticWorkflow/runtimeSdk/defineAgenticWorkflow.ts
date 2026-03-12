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

type McpServerToolDefinitions = Record<
  string,
  Record<string, (toolArguments?: unknown) => Promise<unknown>>
>;
// type McpServerToolDefinitions = {
//   fetch: {
//     fetch_webpage: (args: { url: string }) => Promise<{ content: string }>;
//   };
//   websearch: {
//     search: (args: { q: string }) => Promise<{ results: string[] }>;
//     get_snapshot: (args: { url: string }) => Promise<{ snapshot: string }>;
//   };
// };
//EndOfReplaceMcpServerToolDefinitions;

export type DBGeneratedSchema = {
  tbl1: { columns: { col1: string; col2: number } };
}; //EndOfDBGeneratedSchema;

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
       * Use "true" to allow all fields/filters for a command, or provide a more specific definition for better security.
       * Avoid writing more rule info than necessary. For example, to allow selectingn all fields from all data just use "select: true" instead of defining all the fields and using "select: { fields: "*" }".
       */
      tablePermissions: Record<
        /**
         * keyof DBGeneratedSchema or new table names from tableCreateStatements
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
      mode: "execute_sql_with_commit" | "execute_readonly_sql";
    };

type DbTableHandler = {
  [TableName in keyof DBGeneratedSchema]: TableHandler<
    DBGeneratedSchema[TableName]["columns"],
    DBGeneratedSchema
  >;
};

export type DatabaseHandler = {
  /**
   * The table handlers below are only available if databaseAccessDefinitions are defined
   * Must provide the correct data type in filters (do not provide a boolean if the column is a string, etc.)
   */
  db: DbTableHandler;

  /**
   * Runs a raw SQL query.
   * Prefer to use the table handlers above when possible, as they are safer.
   * Only available if databaseAccessDefinitions.mode is "execute_sql_with_commit" or "execute_readonly_sql".
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

/**
 * Prefer to use this over "custom" or "enum" to restrict the input and make it easier for the user to choose the correct value.
 */
export type UserInputItem =
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
  enum: string;
  custom: unknown;
};

export type ValueOfUserInput<UserInput extends Record<string, UserInputItem>> =
  {
    [InputName in keyof UserInput]?: UserInputOutputMapping[UserInput[InputName]["type"]];
  };

export type DefineAgenticWorkflow = <
  OrchestrationTools extends McpServerToolsAllowed,
  AgentDefinitions extends Record<string, AgentDefinition>,
  UserInput extends Record<string, UserInputItem>,
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
    databaseAccessDefinitions?: DatabaseAccessDefinition;
    orchestrationTools?: OrchestrationTools;
    agentDefinitions?: AgentDefinitions;
  },
  workflow: (
    agentHandlers: {
      [AgentName in keyof AgentDefinitions]: (
        agentInput?: string,
      ) => Promise<ParseSchema<AgentDefinitions[AgentName]["outputSchema"]>>;
    },
    databaseHandler: DatabaseHandler,
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
    containerConfiguration: { timeout: 60_000 },
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
    orchestrationTools: {
      websearch: { search: 1, get_snapshot: 1 },
    },
    agentDefinitions: {
      researcher: {
        prompt: "You are a research assistant.",
        tools: { fetch: { fetch: 1 } },
        outputSchema: {
          summary: { type: "string" },
          references: { type: "string[]" },
        },
      },
    },
  },
  async ({ researcher }, { db }, { websearch }) => {

    const doResearch = async () => {
      const result = await researcher(`research_topic: "Prostgles"`);
      await db.my_research_topics.insert({
        topic: "Prostgles",
        summary: result.summary,
        references: result.references,
      });
    }
    await doResearch();
    
    const finalTopics = await db.my_research_topics.find({
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

    await websearch.search({ q: "Prostgles" });
  },
);

 */

/* 

import { defineAgenticWorkflow } from "./defineAgenticWorkflow";

void defineAgenticWorkflow(
  {
    name: "Instante Case Scraper",
    containerConfiguration: { 
      timeout: 300000,
      cpus: "1",
      memory: "1g",
      internetAccess: "bridge",
      readOnly: false
    },
    databaseAccessDefinitions: {
      mode: "custom",
      tablePermissions: {
        instante_cases: { 
          select: true, 
          insert: true,
          update: true
        },
        instante_import_state: {
          select: true,
          insert: true,
          update: true
        }
      },
      tableCreateStatements: `
        CREATE TABLE IF NOT EXISTS instante_import_state (
          case_type text PRIMARY KEY,
          items_per_page int4 NOT NULL DEFAULT 5000,
          last_page_completed int4 NOT NULL DEFAULT -1,
          detected_last_page int4,
          status text,
          last_run_started_at timestamptz,
          last_run_finished_at timestamptz,
          notes text,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        
        CREATE TABLE IF NOT EXISTS instante_cases (
          id int8 PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
          instance_name text,
          case_number text,
          case_title text,
          decision_date_raw text,
          registration_date date,
          publication_date date,
          case_type text,
          case_topic text,
          judge text,
          pdf_path text,
          pdf_url text,
          pdf_uuid text,
          source_page int4,
          source_items_per_page int4,
          row_fingerprint text NOT NULL UNIQUE,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        );
      `
    },
    orchestrationTools: {
      websearch: { websearch: 1, get_snapshot: 1, get_document_text: 1 }
    },
    userInput: {
      caseType: {
        title: "Select case type to scrape",
        type: "enum",
        values: ["All", "Penal", "Civil", "Contencios administrativ", "Fiscal", "Comercial", "Munca si asigurari sociale", "Minor si familie"],
        optional: false
      },
      itemsPerPage: {
        title: "Items per page (max 5000 recommended)",
        type: "custom",
        dataType: "number",
        optional: true
      }
    }
  },
  async (agentHandlers, db, { websearch }, userInputValues, setProgress) => {
    const caseType = (userInputValues.caseType as string) || "All";
    const itemsPerPage = (userInputValues.itemsPerPage as number) || 5000;
    
    await setProgress(0, "Starting scraper for case type: " + caseType);
    
    const casesTable = db.db.instante_cases;
    const stateTable = db.db.instante_import_state;
    
    let importState = await stateTable.findOne({ case_type: caseType });
    
    if (!importState) {
      await stateTable.insert({
        case_type: caseType,
        items_per_page: itemsPerPage,
        last_page_completed: -1,
        status: "initialized"
      });
      importState = await stateTable.findOne({ case_type: caseType });
    }
    
    await stateTable.update(
      { case_type: caseType },
      { 
        status: "running", 
        last_run_started_at: new Date().toISOString(),
        items_per_page: itemsPerPage,
        notes: "Started at " + new Date().toISOString()
      }
    );
    
    await setProgress(5, "Fetching initial page to detect total pages...");
    
    const parseDate = (v: string | null): string | null => {
      if (!v) return null;
      const s = (v || "").split(/\s+/).join(" ").trim();
      
      const m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (m1) {
        const y = parseInt(m1[1], 10).toString().padStart(4, "0");
        const mo = parseInt(m1[2], 10).toString().padStart(2, "0");
        const d = parseInt(m1[3], 10).toString().padStart(2, "0");
        return y + "-" + mo + "-" + d;
      }
      
      const m2 = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (m2) {
        const d = parseInt(m2[1], 10).toString().padStart(2, "0");
        const mo = parseInt(m2[2], 10).toString().padStart(2, "0");
        const y = parseInt(m2[3], 10).toString().padStart(4, "0");
        return y + "-" + mo + "-" + d;
      }
      
      return null;
    };
    
    const clean = (x: string | null): string => {
      return (x || "").split(/\s+/).join(" ").trim();
    };
    
    const fetchPage = async (page: number): Promise<{ rows: any[]; maxPage: number }> => {
      const params = new URLSearchParams({
        Instance: "All",
        Numarul_dosarului: "",
        Denumirea_dosarului: "",
        date: "",
        Tematica_dosarului: "",
        Tipul_dosarului: caseType === "All" ? "All" : caseType,
        items_per_page: itemsPerPage.toString(),
        page: page.toString()
      });
      
      const url = "https://instante.justice.md/ro/hotaririle-instantei?" + params.toString();
      const snapshot = await websearch.get_snapshot({ url });
      
      const rows: any[] = [];
      let maxPage = 0;
      
      const pagerMatches = snapshot.match(/page=(\d+)/g) || [];
      if (pagerMatches.length > 0) {
        const pages = pagerMatches.map(m => parseInt(m.replace("page=", ""), 10));
        maxPage = Math.max(...pages, 0);
      }
      
      const tableMatch = snapshot.match(/<table[^>]*class="[^"]*view-decisions[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
      if (tableMatch) {
        const tableContent = tableMatch[1];
        const rowMatches = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];
        
        for (const rowMatch of rowMatches) {
          const cellMatches = rowMatch.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
          if (cellMatches.length >= 10) {
            const cells = cellMatches.map(c => {
              const text = c.replace(/<[^>]*>/g, " ").trim();
              return clean(text);
            });
            
            const pdfMatch = rowMatch.match(/<a[^>]*href="([^"]*\.pdf[^"]*)"[^>]*>/i);
            const pdfPath = pdfMatch ? pdfMatch[1] : null;
            const pdfUuid = pdfPath && pdfMatch ? (pdfPath.match(/\/([0-9A-Fa-f\-]{20,})$/)?.[1]?.toUpperCase() || null) : null;
            
            const rec: any = {
              instance_name: cells[0] || null,
              case_number: cells[1] || null,
              case_title: cells[2] || null,
              decision_date_raw: cells[3] || null,
              registration_date: parseDate(cells[4]),
              publication_date: parseDate(cells[5]),
              case_type: cells[6] || null,
              case_topic: cells[7] || null,
              judge: cells[8] || null,
              pdf_path: pdfPath,
              pdf_url: pdfPath ? "https://instante.justice.md" + pdfPath : null,
              pdf_uuid: pdfUuid,
              source_page: page,
              source_items_per_page: itemsPerPage,
            };
            
            const fp = [
              rec.instance_name,
              rec.case_number,
              rec.case_title,
              rec.decision_date_raw,
              rec.registration_date,
              rec.publication_date,
              rec.case_type,
              rec.case_topic,
              rec.judge,
              rec.pdf_path
            ].map(v => v || "").join("||");
            
            const crypto = await import("crypto");
            rec.row_fingerprint = crypto.createHash("sha256").update(fp).digest("hex");
            
            rows.push(rec);
          }
        }
      }
      
      return { rows, maxPage };
    };
    
    const upsertRows = async (rows: any[]) => {
      console.log("upsertRows", rows.length)
      if (rows.length === 0) return 0;
      
      for (const row of rows) {
        try {
          await casesTable.upsert(
            { row_fingerprint: row.row_fingerprint },
            {
              instance_name: row.instance_name,
              case_number: row.case_number,
              case_title: row.case_title,
              decision_date_raw: row.decision_date_raw,
              registration_date: row.registration_date,
              publication_date: row.publication_date,
              case_type: row.case_type,
              case_topic: row.case_topic,
              judge: row.judge,
              pdf_path: row.pdf_path,
              pdf_url: row.pdf_url,
              pdf_uuid: row.pdf_uuid,
              source_page: row.source_page,
              source_items_per_page: row.source_items_per_page,
            }
          );
        } catch (e) {
          console.error("Error upserting row: " + e);
        }
      }
      
      return rows.length;
    };
    
    let lastPageCompleted = importState?.last_page_completed ?? -1;
    let startPage = Math.max(0, lastPageCompleted + 1);
    
    const { rows: initialRows, maxPage: detectedMaxPage } = await fetchPage(0);
    
    if (detectedMaxPage > 0) {
      await stateTable.update(
        { case_type: caseType },
        { detected_last_page: detectedMaxPage }
      );
    }
    
    const maxPage = detectedMaxPage > 0 ? detectedMaxPage : 1000;
    
    await setProgress(10, "Detected " + maxPage + " pages. Starting from page " + startPage + "...");
    
    let currentPage = startPage;
    let totalInserted = 0;
    
    while (currentPage <= maxPage) {
      let attempt = 0;
      let success = false;
      
      while (!success && attempt < 5) {
        try {
          await setProgress(10 + Math.floor((currentPage / maxPage) * 80), "Processing page " + currentPage + "/" + maxPage + " (attempt " + (attempt + 1) + ")");
          
          const { rows, maxPage: updatedMaxPage } = await fetchPage(currentPage);
          
          if (updatedMaxPage > maxPage) {
            await stateTable.update(
              { case_type: caseType },
              { detected_last_page: updatedMaxPage }
            );
          }
          
          const inserted = await upsertRows(rows);
          totalInserted += inserted;
          
          await stateTable.update(
            { case_type: caseType },
            { 
              last_page_completed: currentPage,
              notes: "Page " + currentPage + " done (" + inserted + " rows) at " + new Date().toISOString()
            }
          );
          
          if (currentPage % 5 === 0) {
            await setProgress(10 + Math.floor((currentPage / maxPage) * 80), "Completed page " + currentPage + ". Total rows: " + totalInserted);
          }
          
          success = true;
          
          await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
          
        } catch (e: any) {
          attempt++;
          if (attempt >= 5) {
            await stateTable.update(
              { case_type: caseType },
              { 
                status: "error",
                notes: "Failed at page " + currentPage + ": " + (e.message?.substring(0, 900) || e)
              }
            );
            throw e;
          }
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000 + Math.random() * 1000));
        }
      }
      
      currentPage++;
    }
    
    await stateTable.update(
      { case_type: caseType },
      { 
        status: "completed",
        last_run_finished_at: new Date().toISOString(),
        notes: "Completed at " + new Date().toISOString() + ". Total pages: " + maxPage + ", Total rows: " + totalInserted
      }
    );
    
    await setProgress(100, "Completed! Processed " + (maxPage + 1) + " pages, " + totalInserted + " total rows.");
  }
);

*/

export const END_OF_SCHEMA_PLACEHOLDER =
  "export const END_OF_SCHEMA_PLACEHOLDER =";

export { defineAgenticWorkflow } from "./defineAgenticWorkflowHandlers";
