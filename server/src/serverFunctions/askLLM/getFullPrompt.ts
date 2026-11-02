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
  const fileTableConfig = activeConnection?.dbConf.file_table_config;
  const fileTableName = fileTableConfig?.fileTable;
  const fileStorageInfo =
    !activeConnection ?
      "File storage status is unavailable because the connection is not active. Do not assume it is enabled."
    : !fileTableName ?
      "File storage is disabled for this connection. Enable it in Connection configuration > File storage before uploading files. Creating a table named files does not enable managed storage."
    : [
        `File storage is enabled for this connection: managed file table ${JSON.stringify(fileTableName)}, storage type ${fileTableConfig.storageType.type}. File bytes live in configured server-side local storage or S3, outside PostgreSQL and outside the workflow container; the table stores metadata.`,
        `Upload files using the normal database tools ${getProstglesMCPFullToolName("db", "insert")} or ${getProstglesMCPFullToolName("db", "insertMany")}. No separate upload tool or endpoint is needed. Storage enablement does not grant access: request the required tool and table permissions if missing. Raw SQL writes bypass managed file storage.`,
        `Each upload requires original_name (including extension) and data. For JSON/MCP requests use data: { encoding: "base64", data: "<standard base64 file bytes>" }; do not use a bare base64 string, file path, URL, or data URL. A byte array or { type: "Buffer", data: [0, 1, 2] } is also accepted. Node.js Buffer values serialize to the latter form.`,
        `Example ${getProstglesMCPFullToolName("db", "insert")} arguments: ${JSON.stringify(
          {
            tableName: fileTableName,
            data: {
              original_name: "hello.txt",
              data: { encoding: "base64", data: "SGVsbG8=" },
            },
            returning: { id: 1, url: 1 },
          },
        )}. For insertMany, data is an array of these file objects.`,
        `original_last_modified is optional (timestamp string). Custom metadata columns may also be written when permitted. Do not supply generated storage fields such as content_type, content_length, extension, url, or storage_key; Prostgles derives them.`,
        `Replace file bytes through ${getProstglesMCPFullToolName("db", "update")} with a filter, original_name and data in the same upload format. Delete through ${getProstglesMCPFullToolName("db", "delete")}.`,
        `In workflows use tableHandlers[${JSON.stringify(fileTableName)}].insert(file, { returning: { id: 1, url: 1 } }) or .insertMany(files, ...), with the file table included in databaseAccessDefinitions.tablePermissions. Read mounted input files with node:fs and pass their bytes; mounting a file alone does not upload it.`,
        `Read file bytes through the returned url (resolve relative URLs against the Prostgles application URL and use authorized access). The database data column is a placeholder, not the stored bytes. DOCKER_MCP_ENDPOINT is a tool proxy, not the file-serving base URL.`,
        `Text extraction is ${(fileTableConfig.extractText ?? !!fileTableConfig.annotationsTable) ? "enabled" : "disabled"}. When enabled, the document (docling) service asynchronously populates text_content (Markdown page array) and docling_metadata for supported files. Do not assume they are populated immediately; $array_element can access individual array elements.`,
      ].join("\n");
  const schemaWithInfo =
    !schema ?
      "No database schema was supplied. This does not establish that the database is empty."
    : [
        "Below (in the next sql code block) is the schema of database they're currently working with expressed as create statements so you have a better idea of relationships and constraints.",
        "\n\nIMPORTANT: Wrapped in an sql code block below is the schema of EXISTING TABLES AND VIEWS from the database. Tables can be accessed through the database tools. The schema is expressed as create statements to give you a better idea of relationships and constraints.",
        wrapCode("sql", schema),
        `\n`,
        `When interacting with the tables through non raw SQL tools, it is important that you include double quotes for table names that need escaping. `,
        `For example: db.find(${JSON.stringify("my users")}); db.insert("tools");`,
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
    .replace(
      LLM_PROMPT_VARIABLES.SCHEMA,
      [schemaWithInfo, fileStorageInfo].join("\n\n"),
    )
    .replace(
      LLM_PROMPT_VARIABLES.DB_TYPESCRIPT_SCHEMA,
      wrapCode(
        "typescript",
        await (async () => {
          if (connInfo.is_state_db)
            return (await statePrgl?.getTSSchema())?.tsSchema ?? "";
          const prglConn = connectionManager.prglConnections.get(connectionId);
          if (!prglConn || prglConn.state !== "started") return "";
          return (await prglConn.prgl.getTSSchema()).tsSchema;
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
