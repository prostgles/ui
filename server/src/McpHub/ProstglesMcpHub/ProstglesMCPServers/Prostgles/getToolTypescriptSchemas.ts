import type { DBS } from "@src/index";
import { getJsonSchemaAsTs } from "../../../../../../common/getJsonSchemaAsTs";
import { getValidatedMcpServerToolsAllowed } from "./getValidatedMcpServerToolsAllowed";

export const getToolTypescriptSchemas = async (
  dbs: DBS,
  mcpServerTools: Record<string, Record<string, 1>> | "*",
  mode: "full" | "compact" = "full",
) => {
  const mcpTools = await getValidatedMcpServerToolsAllowed(dbs, mcpServerTools);

  const getTsType = (schema: Record<string, unknown> | null | undefined) => {
    let res = !schema ? "string" : getJsonSchemaAsTs(schema, { mode });
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
    const argsTsSchema = getTsType(inputSchema);
    const outputTsSchema = getTsType(outputSchema);

    const funcDef = `${JSON.stringify(name)}: (args: ${argsTsSchema}) => Promise<${outputTsSchema}>;`;
    const funcDefWithDescription = [
      "/**",
      " * " + escapeForJsDoc(description).split("\n").join("\n * "),
      " */",
      funcDef,
    ].join("\n");
    const def = mode === "compact" ? funcDef : funcDefWithDescription;
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
