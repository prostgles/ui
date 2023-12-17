import { TokenInfo } from "./completionUtils/getTokens";


export const getPrevTokensNoParantheses = (prevTokens: TokenInfo[], excludeParantheses = false) => {
  const pt = structuredClone(prevTokens);
  const prevTokensReversed: typeof prevTokens = [];
  let hasParanthese = 0;
  pt.slice(0).reverse().forEach((t: TokenInfo) => {
    const whiteToken: TokenInfo = { ...t, type: "white.sql", text: " ", textLC: " " };

    if (excludeParantheses && t.text === "()") {
      prevTokensReversed.push(whiteToken);
      return;
    }

    /** Monaco includes double parantheses: t.text === "))"  */
    const uniqueText = Array.from(new Set(t.text.split(""))).join("");
    const pushCurrentParantheses = () => {

      t.text.split("").map((text, i) => {
        prevTokensReversed.push({
          ...(excludeParantheses ? whiteToken : { ...t, text }),
          offset: t.offset - i,
          end: t.end - i,
        });
      })
    }
    if (uniqueText === "(" && hasParanthese) {
      hasParanthese--;
      if (!hasParanthese) {
        pushCurrentParantheses();
      }
      return;
    }

    if (uniqueText === ")") {
      hasParanthese++;
      if (hasParanthese === 1) {
        pushCurrentParantheses();
      }
      return;
    }

    const willPush = !hasParanthese ? t : whiteToken;
    prevTokensReversed.push(willPush);
  });
  return prevTokensReversed.slice(0).reverse();
}

export const getTokenNesting = (rawTokens: TokenInfo[]): (TokenInfo & { nestingId: string; })[] => {
  const startNest = "(";
  const endNest = ")";

  /** Separate grouped tokens */
  const tokens = rawTokens.flatMap(t => {
    const textChars = t.text.split("");
    
    const uniqueText = Array.from(new Set(textChars));
    const allTextIsParens = uniqueText.every(tokenChar => [startNest, endNest].some(v => v === tokenChar));
    if(allTextIsParens){
      return textChars.map((text, i) => {
        const offset = t.offset + i;
        return {
          ...t,
          text,
          textLC: text,
          offset,
          end: offset + 1,
        }
      })
    }
    return t;
  });

  let nestingGroupId = 0;
  /** 111 */
  let nestingId = "";
  return tokens.map((t, i) => {
    const prevToken = tokens[i-1];
    if(prevToken?.text === startNest){
      nestingId += "1";
    }
    
    if(t?.text === endNest){
      nestingId = nestingId.slice(0, -1);
      if(!nestingId){
        nestingGroupId++;
      }
    }

    return {
      ...t,
      nestingId,
    }
  });
}