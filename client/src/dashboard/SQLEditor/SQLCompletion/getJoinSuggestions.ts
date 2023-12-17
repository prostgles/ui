import { suggestSnippets } from "./CommonMatchImports";
import { CodeBlock } from "./completionUtils/getCodeBlock";
import { RawExpect } from "./getExpected";
import { GetKind, ParsedSQLSuggestion, getKind } from "./registerSuggestions";

type Args = {
  ss: ParsedSQLSuggestion[];
  rawExpect: RawExpect, 
  cb: CodeBlock;
  tableSuggestions: ParsedSQLSuggestion[];
}
export const getJoinSuggestions = ({ ss, tableSuggestions, rawExpect, cb }: Args) => {


  const joinSuggestions: ParsedSQLSuggestion[] = [];
  const identifiers = cb.identifiers;
  if(identifiers.length){

    if(cb.ltoken?.textLC === "join" && rawExpect === "tableOrView"){
      const fromTableIdx = cb.prevTokens.findIndex((pt, i) => {
        return cb.prevTokens[i-1]?.textLC === "from";
      });
      const fromTable = cb.prevTokens[fromTableIdx]?.text;
      if(fromTable){
        const fromTableS = ss.find(s => s.type === "table" && s.escapedIdentifier?.includes(fromTable))
        let fromTableAlias = cb.prevTokens[fromTableIdx+1]?.textLC !== "as"? cb.prevTokens[fromTableIdx+1] : cb.prevTokens[fromTableIdx+2];
        const fromTableAliasStr = fromTableAlias?.type === "identifier.sql"? fromTableAlias.text : fromTable;
        if(fromTableS){
          tableSuggestions.forEach(s => {
              if(s.type === "table" && s.name){ //  !== fromTableS.name

                const ftableAlias = getStartingLetters(s.name);
                s.cols?.forEach(c => {
                  let joins: ParsedSQLSuggestion[] = []

                  /** referenced */
                  const fcols = fromTableS?.cols?.filter(c => c.cConstraint?.ftable_name === s.name);
                  if(c.cConstraint?.ftable_name === fromTable){
                    const onCondition = c.cConstraint.conkey!.map((ordPos, cidx) => {
                      const fromOrdPos = c.cConstraint!.confkey![cidx];
                      const fTableCol = `${ftableAlias}.${s.cols?.find(c => c.ordinal_position === ordPos)?.escaped_identifier}`;
                      const tableCol = `${fromTableAliasStr}.${fromTableS.cols?.find(c => c.ordinal_position === fromOrdPos)?.escaped_identifier}`;
                      return `${fTableCol} = ${tableCol}`
                    });
                    joins = suggestSnippets([{
                      label: `${s.escapedIdentifier} ${ftableAlias} ON ${onCondition.join(" OR ")}`,
                      sortText: "a",
                      kind: getKind("table"),
                    }]).suggestions;

                    /** referencing */
                  } else if(fcols?.length){
                    const onCondition = fcols.map(c => c.cConstraint!.confkey?.map((ordPos, cidx) => {
                      const fromTableOrdPos = c.cConstraint?.conkey![cidx];
                      const fTableCol = `${ftableAlias}.${s.cols?.find(c => c.ordinal_position === ordPos)?.escaped_identifier}`;
                      const tableCol = `${fromTableAliasStr}.${fromTableS.cols?.find(c => c.ordinal_position === fromTableOrdPos)?.escaped_identifier}`;
                      return `${fTableCol} = ${tableCol}`
                    }).join(" AND "));
                    joins = suggestSnippets([{
                      label: `${s.escapedIdentifier} ${ftableAlias} ON ${onCondition.join(" OR ")}`,
                      sortText: "a",
                      kind: getKind("table"),
                    }]).suggestions;
                  }                  
                  joins.forEach(j => {
                    if(!joinSuggestions.some(js => js.label === j.label)){
                      joinSuggestions.push(j)
                    }
                  })
                });
              }
          });
        }
      }
    }

    const matches = tableSuggestions.filter(s => identifiers.includes(s.escapedParentName!) );
    if(matches.length){
      return {
        suggestions: matches,
        joinSuggestions: undefined,
      }
    }
  }

  return {
    joinSuggestions,
    suggestions: undefined
  }
}

function getStartingLetters(inputString) {
  if (typeof inputString !== 'string' || inputString.length === 0) {
    return '';
  }

  const words = inputString.split(/[_-]|(?=[A-Z])/);
  const startingLetters = words.map(word => word.charAt(0));

  return startingLetters.join('');
}