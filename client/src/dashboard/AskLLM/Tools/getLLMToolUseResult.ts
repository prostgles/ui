// import type {
//   DBHandlerClient,
//   MethodHandler,
// } from "prostgles-client/dist/prostgles";
// import { getSerialisableError } from "prostgles-types";

// import { getMCPToolNameParts } from "../../../../../commonTypes/mcp";
// import type { DBSSchema } from "../../../../../commonTypes/publishUtils";
// import type { DBSMethods } from "../../Dashboard/DBS";
// import {
//   type ApproveRequest,
//   type ChatDBPermissions,
// } from "./useLLMChatAllowedTools";

// /**
//  * Get tool result without checking if the tool is allowed for the chat
//  */
// export const getLLMToolUseResult = async (
//   chatDBPermissions: ChatDBPermissions | undefined,
//   is_state_db: boolean,
//   matchedTool: ApproveRequest,
//   chatId: number,
//   db: DBHandlerClient,
//   methods: MethodHandler,
//   callMCPServerTool: DBSMethods["callMCPServerTool"],
//   funcName: string,
//   input: any,
// ): Promise<{
//   content: Extract<
//     DBSSchema["llm_messages"]["message"][number],
//     { type: "tool_result" }
//   >["content"];
//   is_error?: true;
// }> => {
//   if (matchedTool.type === "prostgles-db-methods") {
//     const method = methods[matchedTool.functionName];
//     if (method) {
//       const methodFunc = typeof method === "function" ? method : method.run;
//       const result = parseToolResultToMessage(() =>
//         methodFunc(input).then((res) => JSON.stringify(res ?? "")),
//       );
//       return result;
//     }
//   } else if (matchedTool.type === "prostgles-db") {
//     // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
//     if (matchedTool.tool_name === "execute_sql") {
//       return parseToolResultToMessage(async () => {
//         if (is_state_db) {
//           throw new Error(
//             "Executing SQL on Prostgles UI state database is not allowed for security reasons",
//           );
//         }
//         const sql = db.sql;
//         if (!sql) throw new Error("Executing SQL not allowed to this user");
//         const query = input.sql;
//         if (typeof query !== "string") {
//           throw new Error("input.sql must be a string");
//         }
//         if (!chatDBPermissions) {
//           throw new Error("chatDBPermissions is not defined");
//         }
//         const { query_timeout = 0, commit = false } = chatDBPermissions;
//         const finalQuery =
//           query_timeout && Number.isInteger(query_timeout) ?
//             [`SET LOCAL statement_timeout to '${query_timeout}s'`, query].join(
//               ";\n",
//             )
//           : query;
//         const { rows } = await sql(
//           finalQuery,
//           {},
//           { returnType: commit ? "rows" : "default-with-rollback" },
//         );
//         return JSON.stringify(rows);
//       });
//     }
//     // if (dbTool?.name === taskTool.name) {
//     //   // const data = input as { suggested_tools: { tool_name: string }[] };
//     //   // const suggestedToolNames = data.suggested_tools.map((t) => t.tool_name);
//     //   // await dbs.llm_chats_allowed_mcp_tools.delete({
//     //   //   chat_id: chatId,
//     //   // });
//     //   // const suggestedTools = allToolsForTask
//     //   //   .map((t) => {
//     //   //     if (t.type !== "mcp" || !suggestedToolNames.includes(t.name)) return;
//     //   //     return {
//     //   //       chat_id: chatId,
//     //   //       tool_id: t.id,
//     //   //     };
//     //   //   })
//     //   //   .filter(isDefined);
//     //   // await dbs.llm_chats_allowed_mcp_tools.insert(suggestedTools);

//     //   return parseToolResultToMessage(async () => {
//     //     return "Done";
//     //   });
//     // }
//     // if (PROSTGLES_UI_MCP_FUNCTION_NAMES.includes(dbTool?.name)) {
//     //   /** TODO: Should validate to ensure the unsert would work */

//     //   return parseToolResultToMessage(async () => {
//     //     return "Done";
//     //   });
//     // }
//   } else {
//     const mcpToolName = getMCPToolNameParts(funcName);
//     if (mcpToolName) {
//       const { serverName, toolName } = mcpToolName;
//       if (!callMCPServerTool) {
//         return {
//           content: "callMCPServerTool not allowed",
//           is_error: true,
//         };
//       }
//       if (!serverName || !toolName) {
//         return {
//           content: "Invalid serverName or toolName",
//           is_error: true,
//         };
//       }

//       const { content, isError } = await callMCPServerTool(
//         chatId,
//         serverName,
//         toolName,
//         input,
//       ).catch((e) => ({
//         content: e instanceof Error ? e.message : JSON.stringify(e),
//         isError: true,
//       }));

//       return {
//         content,
//         ...(isError && {
//           is_error: isError,
//         }),
//       };
//     }
//   }

//   return {
//     content: `LLM Tool ${JSON.stringify(funcName)} not found or not allowed`,
//     is_error: true,
//   };
// };

// const parseToolResultToMessage = (func: () => Promise<any>) => {
//   return func()
//     .then((content: string | undefined) => ({ content: content ?? "" }))
//     .catch((e) => ({
//       content: JSON.stringify(getSerialisableError(e)),
//       is_error: true as const,
//     }));
// };
