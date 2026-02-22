import { LLM_PROMPT_VARIABLES, wrapCode } from "@common/llmUtils";
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
  const schemaWithInfo =
    !schema ?
      "Schema is empty: there are no tables or views in the database"
    : [
        "Below (in the next sql code block) is the schema of database they're currently working with expressed as create statements so you have a better idea of relationships and constraints.",
        "IMPORTANT: this is the schema of EXISTING TABLES AND VIEWS that can be accessed through the database tools.",
        wrapCode("sql", schema),
        `\n`,
        `When interacting with the tables through non raw SQL tools, it is important that you include double quotes for table names that need escaping. `,
        `For example: db.find(${JSON.stringify("my users")}); db.insert("tools");`,
        `\n`,
        `When you need to reference records from the database use an anchor to ensure the user can quickly preview them.`,
        `The tag must be of this format: `,
        wrapCode(
          "html",
          `<a href="#record" data-table-name="{the name of the table}" data-column-name="{the name of the column to filter by (should ideally have a pkey constraint)}" data-column-value="{the value of the column/pkey}">{pkey and/or name and/or other data}</a>`,
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
          if (connInfo.is_state_db) return statePrgl?.getTSSchema() ?? "";
          const prglConn = connectionManager.prglConnections.get(connectionId);
          if (!prglConn || prglConn.state !== "started") return "";
          return prglConn.prgl.getTSSchema();
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
