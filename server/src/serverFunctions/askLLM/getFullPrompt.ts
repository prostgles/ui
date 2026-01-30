import { LLM_PROMPT_VARIABLES, wrapCode } from "@common/llmUtils";
import { getElectronConfig, getRootDir } from "@src/electronConfig";
import { connectionManager } from "@src/index";
import { statePrgl } from "@src/init/startProstgles";
import { readFileSync } from "fs";

const getTextBetween = (str: string, start: string, end: string): string => {
  const startIndex = str.indexOf(start);
  if (startIndex === -1) throw "Start string not found";
  const endIndex = str.indexOf(end, startIndex + start.length);
  if (endIndex === -1) throw "End string not found";
  const result = str.slice(startIndex, endIndex).trim();
  if (!result) throw "No text found between markers";
  return result;
};

const commonHandlers = readFileSync(
  getRootDir() + "/node_modules/prostgles-types/dist/index.d.ts",
  "utf-8",
);
const viewHandlerStart = getTextBetween(
  commonHandlers,
  "export type ViewHandler",
  "export type JoinMakerOptions",
);
const clientHandlers = readFileSync(
  getRootDir() + "/../client/node_modules/prostgles-client/dist/prostgles.d.ts",
  "utf-8",
);

const fullHandlers =
  viewHandlerStart +
  getTextBetween(
    clientHandlers,
    "export type AsyncResult",
    "type SyncDebugEvent",
  );

// throw fullHandlers;

export const getFullPrompt = async ({
  prompt,
  schema,
  dashboardTypesContent,
  connectionId,
}: {
  prompt: string;
  schema: string;
  dashboardTypesContent: string;
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
      wrapWithCodeBlock("typescript", fullHandlers),
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
