import { SQLMatcher } from "./registerSuggestions";
import { withKWDs } from "./withKWDs";

const KWDS = [
  { kwd: "REASSIGN" },
  { kwd: "OWNED", justAfter: ["REASSIGN"] },
  { kwd: "BY", expects: "role", justAfter: ["OWNED"] },
  { kwd: "TO", expects: "role", dependsOn: "BY" },
  { kwd: ";",  dependsOn: "TO" },
] as const;

export const MatchReassign: SQLMatcher = {
  match: cb => cb.prevLC.startsWith("reassign"),
  result: async ({cb, ss, getKind}) => {

    const { getSuggestion, remainingKWDS, prevKWD } = withKWDs(KWDS,cb,getKind, ss);
    
    const result = getSuggestion();

    if(prevKWD?.kwd === "TO" && result.suggestions.length){
      const prevUser = cb.tokens.find((t, i, arr) => {
        return arr[i-1]?.textLC === "by";
      });
      /** Exclude prev (BY) user from suggestions */
      if(prevUser){
        return {
          suggestions: result.suggestions.filter(t => t.name !== prevUser.text)
        }
      }
    }

    return result;

  }
}

