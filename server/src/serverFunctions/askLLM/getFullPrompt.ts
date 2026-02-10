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
      schema ?
        wrapCode("sql", schema)
      : "Schema is empty: there are no tables or views in the database",
    )
    .replace(
      LLM_PROMPT_VARIABLES.DB_TYPESCRIPT_SCHEMA,
      wrapWithCodeBlock(
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
      wrapWithCodeBlock("typescript", prostglesApiTypes),
    );
  // .replace(
  //   LLM_PROMPT_VARIABLES.DASHBOARD_TYPES,
  //   wrapCode("typescript", dashboardTypesContent),
  // );
  return promptWithContext;
};

const wrapWithCodeBlock = (language: "sql" | "typescript", code: string) => {
  const backticks = "```";
  return `${backticks}${language}\n${code}\n${backticks}`;
};
