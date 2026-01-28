import { LLM_PROMPT_VARIABLES, wrapCode } from "@common/llmUtils";
import { getElectronConfig } from "@src/electronConfig";

export const getFullPrompt = ({
  prompt,
  schema,
  dashboardTypesContent,
}: {
  prompt: string;
  schema: string;
  dashboardTypesContent: string;
}) => {
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
    );
  // .replace(
  //   LLM_PROMPT_VARIABLES.DASHBOARD_TYPES,
  //   wrapCode("typescript", dashboardTypesContent),
  // );
  return promptWithContext;
};
