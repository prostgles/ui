import { getMCPFullToolName, getMCPToolNameParts } from "@common/prostglesMcp";
import type { DBS } from "@src/index";
import { convertJsonSchemaToTypes } from "./getJsonSchemaAsTs";

export const getToolTypescriptSchemas = async (
  dbs: DBS,
  toolNames: string[] | undefined,
) => {
  const splitToolNames = toolNames?.map((name) => {
    const nameParts = getMCPToolNameParts(name);
    if (!nameParts) {
      throw new Error(
        `Invalid tool name: ${name}. Expected format: ${getMCPFullToolName("serverName", "toolName")}`,
      );
    }
    return nameParts;
  });
  const mcpTools = await dbs.mcp_server_tools.find(
    !splitToolNames?.length ?
      {}
    : {
        $and: splitToolNames.map(({ serverName, toolName }) => ({
          name: toolName,
          server_name: serverName,
        })),
      },
  );

  const getTsType = (schema: Record<string, unknown> | null | undefined) => {
    let res =
      !schema ? "string" : (
        convertJsonSchemaToTypes(schema) //.then((v) => v.trim().slice(v.indexOf("{")))
      );
    res = res.trim();
    res = res || " unknown";
    if (res.startsWith(`export type Root = `)) {
      res = res.slice(`export type Root = `.length);
    }
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

    const funcDef = [
      "/**",
      " * " + escapeForJsDoc(description).split("\n").join("\n * "),
      " */",
      `${JSON.stringify(name)}: (args: ${argsTsSchema}) => Promise<${outputTsSchema}>;`,
    ].join("\n");
    result[server_name] ??= {};
    result[server_name][name] = funcDef;
  }

  return result;
};
const escapeForJsDoc = (text: string) => {
  return text
    .replace(/\r\n?/g, "\n") // normalize newlines
    .replace(/\*\//g, "*\\/"); // prevent closing the comment
};
