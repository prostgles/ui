import { transpileDeclaration } from "typescript";
import { END_OF_SCHEMA_PLACEHOLDER } from "../runtimeSdk/defineAgenticWorkflow";

export const getWorkflowDeclaration = (workflowSdkSource: string) => {
  const source =
    workflowSdkSource.split(END_OF_SCHEMA_PLACEHOLDER)[0] +
    "\nexport declare const defineAgenticWorkflow: DefineAgenticWorkflow;\n";
  return transpileDeclaration(source, {}).outputText;
};
