import type { DBS } from "@src/index";
import { getJsonSchemaAsTs } from "@common/getJsonSchemaAsTs";
import { getValidatedMcpServerToolsAllowed } from "../definitionValidation/getValidatedMcpServerToolsAllowed";
import { PROSTGLES_MCP_SERVERS_AND_TOOLS } from "@common/prostglesMcp";

export const getToolTypescriptSchemas = async (
  dbs: DBS,
  mcpServerTools: Record<string, Record<string, 1>> | "*",
  mode: "full" | "basic" | "compact" = "full",
) => {
  const mcpTools = await getValidatedMcpServerToolsAllowed(
    dbs,
    mcpServerTools,
    undefined,
  );

  const getTsType = (schema: Record<string, unknown> | null | undefined) => {
    let res =
      !schema ? "string" : (
        getJsonSchemaAsTs(schema, { mode: mode === "basic" ? "compact" : mode })
      );
    res = res.trim();
    res = res || " unknown";
    if (res.endsWith(";")) {
      return res.slice(0, -1);
    }
    return res;
  };

  const result: Record<string, Record<string, string>> = {};
  for (const {
    name,
    server_name,
    inputSchema,
    outputSchema,
    description,
  } of mcpTools) {
    const prglMcp = getPropertySafe(
      PROSTGLES_MCP_SERVERS_AND_TOOLS,
      server_name,
    );
    const argsTsSchema = getTsType(inputSchema);
    const outputTsSchema = getTsType(outputSchema);

    const funcDef = `${JSON.stringify(name)}: (args: ${argsTsSchema}) => Promise<${outputTsSchema}>;`;
    const funcDefWithDescription = [
      "/**",
      " * " + escapeForJsDoc(description).split("\n").join("\n * "),
      " */",
      funcDef,
    ].join("\n");
    const def =
      mode === "basic" ? description
      : mode === "compact" ? funcDef
      : funcDefWithDescription;
    result[server_name] ??= {};
    result[server_name][name] = def;
  }

  return result;
};
const escapeForJsDoc = (text: string) => {
  return text
    .replace(/\r\n?/g, "\n") // normalize newlines
    .replace(/\*\//g, "*\\/"); // prevent closing the comment
};

export const getPropertySafe = <T extends object>(
  obj: T,
  key: string,
): T[keyof T] | undefined => {
  return key in obj ? obj[key as keyof T] : undefined;
};
