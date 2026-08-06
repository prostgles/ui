import { LLM_PROMPT_VARIABLES, wrapCode } from "@common/llmUtils";
import { getProstglesMCPFullToolName } from "@common/mcpUtils";
import { prostglesApiTypes } from "@common/prostglesApiTypes";
import { getElectronConfig } from "@src/electronConfig";
import { connectionManager } from "@src/index";
import { statePrgl } from "@src/init/startProstgles";

export const getFullPrompt = async ({
  prompt,
  schema,
  connectionId,
}: {
  prompt: string;
  schema: string;
  connectionId: string;
}) => {
  const connInfo = await connectionManager.getConnectionData(connectionId);
  const activeConnection =
    connectionManager.getActiveConnectionSilentFail(connectionId);
  const fileTableName = activeConnection?.dbConf.file_table_config?.fileTable;
  const schemaWithInfo =
    !schema ?
      "Schema is empty: there are no tables or views in the database"
    : [
        "Below (in the next sql code block) is the schema of database they're currently working with expressed as create statements so you have a better idea of relationships and constraints.",
        "\n\nIMPORTANT: Wrapped in an sql code block below is the schema of EXISTING TABLES AND VIEWS from the database. Tables can be accessed through the database tools. The schema is expressed as create statements to give you a better idea of relationships and constraints.",
        wrapCode("sql", schema),
        `\n`,
        `When interacting with the tables through non raw SQL tools, it is important that you include double quotes for table names that need escaping. `,
        `For example: db.find(${JSON.stringify("my users")}); db.insert("tools");`,
        ...(!fileTableName ?
          []
        : [
            `The database has file storage enabled. The table named "${fileTableName}" stores only the necessary metadata and is used to facilitate file access:`,
            `- Files can be inserted only through ${getProstglesMCPFullToolName("db", "insert")} or ${getProstglesMCPFullToolName("db", "insertMany")} and only these properties can be inserted: "data", "original_name", "original_last_modified", "content_type"`,
            `- Files can be updated only through ${getProstglesMCPFullToolName("db", "update")} and only these properties can be updated: "data", "original_name", "original_last_modified", "content_type"`,
            `- Files can be deleted only through ${getProstglesMCPFullToolName("db", "delete")}`,
            `- Actual file data can be accessed by fetching the "url". The "data" column in the database is just a dummy placeholder.`,
            `- The "text_content" and "docling_metadata" columns can be used for text searching. They are populated by the document (docling) service which extracts text data from applicable file types.`,
          ]),
        `\n`,
        `When you need to reference records from the database use an anchor to ensure the user can quickly preview them.`,
        `The tag must be of this format for a single record: `,
        wrapCode(
          "html",
          `<a href="#record" data-table-name="{the name of the table}" data-column-name="{the name of the column to filter by (should ideally have a pkey constraint)}" data-column-value="{the value of the column/pkey}">{pkey and/or name and/or other data}</a>`,
        ),
        `And this format for multiple records: `,
        wrapCode(
          "html",
          `<a href="#records" data-table-name="{the name of the table}" data-filter="{valid DetailedTableFilter[] filter expressed as json. E.g.: [{ "fieldName": "temperature", "type": "$gt", "value": 22 }]">{some relevant text}</a>`,
        ),
      ].join("\n");
  const promptWithContext = prompt
    .replaceAll(
      LLM_PROMPT_VARIABLES.PROSTGLES_SOFTWARE_NAME,
      getElectronConfig()?.isElectron ? "Prostgles Desktop" : "Prostgles UI",
    )
    .replace(
      LLM_PROMPT_VARIABLES.TODAY,
      new Date().toISOString().split("T")[0]!,
    )
    .replace(LLM_PROMPT_VARIABLES.SCHEMA, schemaWithInfo)
    .replace(
      LLM_PROMPT_VARIABLES.DB_TYPESCRIPT_SCHEMA,
      wrapCode(
        "typescript",
        (() => {
          if (connInfo.is_state_db)
            return statePrgl?.getTSSchema().tsSchema ?? "";
          const prglConn = connectionManager.prglConnections.get(connectionId);
          if (!prglConn || prglConn.state !== "started") return "";
          return prglConn.prgl.getTSSchema().tsSchema;
        })(),
      ),
    )
    .replace(
      LLM_PROMPT_VARIABLES.DB_HANDLER_SCHEMA,
      wrapCode("typescript", prostglesApiTypes),
    );
  // .replace(
  //   LLM_PROMPT_VARIABLES.DASHBOARD_TYPES,
  //   wrapCode("typescript", dashboardTypesContent),
  // );
  return promptWithContext;
};
