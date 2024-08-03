import type { SQLSuggestion } from "../SQLEditor";
import { getTableExpressionSuggestions } from "./completionUtils/getTableExpressionReturnTypes";
import { getJoinSuggestions } from "./getJoinSuggestions";
import type { ParsedSQLSuggestion, SQLMatchContext } from "./registerSuggestions";

export const suggestTableLike = async (args: Pick<SQLMatchContext, "cb" | "ss" | "sql">) => {
  const { cb, ss, sql } = args;
  const isTableLike = (t: SQLSuggestion["type"]) => ["table", "view", "mview"].includes(t);
  const schemas = ss.filter(s => s.type === "schema");
  const { ltoken } = cb;
  const maybeSchemaName = cb.currToken?.text === "."? cb.ltoken?.text : cb.currToken?.text.includes(".")? cb.currToken.text.split(".")[0] : undefined;
  const isSearchingSchemaTable = maybeSchemaName && schemas.some(s => s.name === maybeSchemaName);
  let schemaMatchingTables: ParsedSQLSuggestion[] = [];
  if(isSearchingSchemaTable && ltoken){
    const matchingTables = ss.filter(s => isTableLike(s.type) && s.schema === maybeSchemaName);
    schemaMatchingTables = matchingTables.map(t => ({
      ...t,
      sortText: "a",
      insertText: t.escapedName ?? t.escapedIdentifier ?? t.name
    }))
  }

  let aliasedTables: ParsedSQLSuggestion[] = [];
  if(cb.ftoken?.textLC === "with"){
    const dw = await getTableExpressionSuggestions({ cb, ss, sql }, "table");
    aliasedTables = dw.tables.map(t => ({ ...t, sortText: "a" }));
  }

  const schemaTables = isSearchingSchemaTable? schemaMatchingTables : 
    ss.filter(s => isTableLike(s.type) && !(s.tablesInfo?.oid && aliasedTables.some(at => at.tablesInfo?.oid === s.tablesInfo?.oid))).map(s => ({ ...s, sortText: s.schema === "public"? "b" : "c" }));
  const tables = [
    ...schemaTables,
    ...aliasedTables,
  ];

  const setofFuncs = ss.filter(s => {
    return (!isSearchingSchemaTable || s.funcInfo?.schema === maybeSchemaName) && s.funcInfo?.restype?.toLowerCase().includes("setof");
  }).map(s => ({ ...s, sortText: "c" }));

  const { joinSuggestions = [] } = getJoinSuggestions({ ss, rawExpect: "tableOrView", cb, tableSuggestions: ss.filter(s => s.type === "table" )}); 

  return {
    suggestions: [
      ...joinSuggestions.map(s => ({ ...s, sortText: "1" })),
      ...tables,
      ...setofFuncs
    ]
  }
}