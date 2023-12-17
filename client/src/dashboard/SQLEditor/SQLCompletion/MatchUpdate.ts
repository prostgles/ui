import { getExpected } from "./getExpected";
import { SQLMatcher } from "./registerSuggestions";
import { suggestCondition } from "./suggestCondition";
import { withKWDs } from "./withKWDs";


const KWDs = [
  { kwd: "UPDATE", expects: "table" },
  { kwd: "SET", expects: "column", justAfter: ["UPDATE"] },
  { kwd: ",", expects: "column" , canRepeat: true },
  { kwd: "WHERE", expects: "condition" },
  { kwd: "RETURNING", expects: "column" },
] as const

export const MatchUpdate: SQLMatcher = {
  match: ({ prevTopKWDs }) => {
    
    return prevTopKWDs.slice(0, 2).some(t => ["UPDATE"].includes(t.text));
  },
  result: async (args) => {
    const { cb, ss, getKind} = args;
    const { prevTokens, ltoken } = cb;

    if(prevTokens.length === 1){
      return {
        suggestions: getExpected("table", cb, ss).suggestions.map(s => ({
          ...s,
          label: `${s.name}...`,
          insertText: s.insertText + `\nSET`
        }))
      }
    }

    if(ltoken?.text === ","){
      const cols = getExpected("column", cb, ss);
      return {
        // space added after = to prevent bad suggestions (next kwd) showing up
        suggestions: cols.suggestions.map(c => ({ ...c, insertText: `${c.insertText} = `})) 
      }
    }

    if(ltoken?.text === "="){
      const cond = await suggestCondition(args, true);
      if(cond) return cond;
    }

    return withKWDs(KWDs, cb, getKind, ss).getSuggestion();

  }
}