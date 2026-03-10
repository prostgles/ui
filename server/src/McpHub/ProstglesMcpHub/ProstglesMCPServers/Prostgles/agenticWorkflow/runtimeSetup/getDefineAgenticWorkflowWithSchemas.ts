export const getDefineAgenticWorkflowWithSchemas = ({
  defineAgenticWorkflowTs,
  mcpServerToolDefinitions,
  dbGeneratedSchema,
}: {
  defineAgenticWorkflowTs: string;
  mcpServerToolDefinitions: Record<string, Record<string, string>> | undefined;
  dbGeneratedSchema: string;
}) => {
  const startOfReplace = defineAgenticWorkflowTs.indexOf(
    "type McpServerToolDefinitions = ",
  );
  const endOfReplace = defineAgenticWorkflowTs.lastIndexOf(
    "//EndOfReplaceMcpServerToolDefinitions;",
  );
  if (
    startOfReplace === -1 ||
    endOfReplace === -1 ||
    endOfReplace < startOfReplace
  ) {
    throw new Error(
      "Could not find placeholder for McpServerToolDefinitions in defineAgenticWorkflow.ts",
    );
  }

  if (!mcpServerToolDefinitions) {
    return (
      defineAgenticWorkflowTs.slice(
        0,
        defineAgenticWorkflowTs.indexOf("// type McpServerToolDefinitions ="),
      ) + defineAgenticWorkflowTs.slice(endOfReplace)
    );
  }

  const McpTypes = [
    "type McpServerToolDefinitions = {",
    ...Object.entries(mcpServerToolDefinitions).map(([serverName, tool]) => {
      return [
        `  ${JSON.stringify(serverName)}: {`,
        ...Object.entries(tool).map(([_toolName, funcDef]) => ` ${funcDef}`),
        "}",
      ].join("\n");
    }),
    "}",
  ].join("\n");

  const result =
    defineAgenticWorkflowTs.slice(0, startOfReplace) +
    McpTypes +
    defineAgenticWorkflowTs.slice(endOfReplace);

  const startOfDbSchemaReplace = result.lastIndexOf(
    "export type DBGeneratedSchema =",
  );
  const endOfDbSchemaReplace = result.lastIndexOf("//EndOfDBGeneratedSchema;");
  if (
    startOfDbSchemaReplace === -1 ||
    endOfDbSchemaReplace === -1 ||
    endOfDbSchemaReplace < startOfDbSchemaReplace
  ) {
    throw new Error(
      "Could not find placeholder for DBGeneratedSchema in defineAgenticWorkflow.ts",
    );
  }
  return (
    result.slice(0, startOfDbSchemaReplace) +
    dbGeneratedSchema +
    result.slice(endOfDbSchemaReplace)
  );
};
