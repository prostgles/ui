import { MinimalSnippet, suggestSnippets } from "../CommonMatchImports";
import { getExpected } from "../getExpected";
import { isInsideFunction } from "../MatchSelect";
import { SQLMatchContext, SQLMatcherResultType } from "../registerSuggestions";
import { suggestCondition } from "../suggestCondition";
import { getNewColumnDefinitions, PG_COLUMN_CONSTRAINTS, REFERENCE_CONSTRAINT_OPTIONS_KWDS } from "../TableKWDs";
import { suggestKWD, withKWDs } from "../withKWDs";

export const matchCreateTable  = async ({ cb, ss, getKind, sql, setS }: SQLMatchContext): Promise<SQLMatcherResultType> => {
  const { prevLC, l2token, l1token, ltoken, thisLineLC, prevTokens } = cb;


  const insideFunc = isInsideFunction(cb);
  if(insideFunc?.prevTextLC?.endsWith("generated always as")){
    const res = await suggestCondition({ cb, ss, getKind, sql, setS }, true);
    if(res) return res; 
  }
  if(prevLC.endsWith("references")){
    return getExpected("table", cb, ss);
  }

  if(ltoken?.textLC === "table"){
    return suggestKWD(getKind, ["$tableName", "IF NOT EXISTS"]);
  }

  if (thisLineLC.includes("references")) {

    if(l2token?.textLC === "references" && ltoken?.text && ltoken.text === "("){
      const table_name = l1token?.text;
      return {
        suggestions: ss.filter(s => s.type === "column" && table_name && s.escapedParentName === table_name)
      }
    }

    const refKWDs = [
      {
        kwd: "REFERENCES",
        expects: "table",
      },
      ...REFERENCE_CONSTRAINT_OPTIONS_KWDS
    ] as const;

    /** Table provided */
    if (ltoken?.text !== "references") {

      return withKWDs(refKWDs, cb, getKind, ss).getSuggestion()

    }

    if (prevTokens.at(-2)?.textLC === "on" && ["DELETE", "UPDATE"].includes(ltoken.text.toUpperCase()) ) { //  && REF_ACTIONS.map(a => a.label.split(" ")[1]?.toLowerCase()).includes(_pwl!)
      
      return withKWDs(refKWDs, cb, getKind, ss).getSuggestion()
    }

  } 

  const showFullColumnSamples = ltoken?.textLC === "," || ltoken?.textLC === "(";
  const showDataTypes = cb.thisLinePrevTokens.length === 1 || cb.thisLinePrevTokens.length === 2 && cb.currToken?.offset === cb.thisLinePrevTokens.at(-1)?.offset;
  // console.log(cb.text, cb.offset, { showFullColumnSamples, showDataTypes, text: cb.text, offset: cb.offset, ltokentext: cb.ltoken?.text });
  if(showFullColumnSamples){
    const snippetLines: MinimalSnippet[] = getNewColumnDefinitions(ss)
      .filter(({ label: v }) => !prevTokens.some(t => t.text === v.split(" ")[0]) ) // Exclude repeats
      .concat([{ label: "$column_name" }])
      .concat([{ label: "${1:col_name} ${2:data_type} ${3:PRIMARY_KEY?} ${4:NOT NULL?} ${5:REFERENCES table_name?} ${6:CHECK(col1 > col2)?}" }])
      .map(v => ({ ...v, insertText: v.label, kind: getKind("column") }))
    return suggestSnippets(snippetLines);
  }

  if (showDataTypes) {
    return getExpected("dataType", cb, ss);
  }

  let snippetLines: { kwd: string; docs?: string }[] = []
  if (cb.thisLinePrevTokens.length) {
    snippetLines = PG_COLUMN_CONSTRAINTS.filter(v => !cb.thisLineLC.includes(v.kwd.toLowerCase()));
    const res = withKWDs(PG_COLUMN_CONSTRAINTS, cb, getKind, ss).getSuggestion().suggestions;
    return { 
      suggestions: [
        ...res,
        ...suggestSnippets(snippetLines.filter(s => !res.some(r => r.name === s.kwd))
          .map(k => ({ label: k.kwd, docs: k.docs, kind: getKind("keyword") }))).suggestions
      ] 
    }
  }

  if (cb.prevLC.endsWith(" default")) {
    const res = getExpected("function", cb, ss)
    return {
      suggestions: res.suggestions.map(s => ({ ...s, sortText: cb.thisLinePrevTokens.some(t => s.funcInfo?.restype?.includes(t.textLC))? (!s.funcInfo?.args.length? "a" : "aa") : (s.sortText ?? "b") }))
    }
  }

  return suggestSnippets(snippetLines.map(k => ({ label: k.kwd, docs: k.docs, kind: getKind("keyword") })))
}