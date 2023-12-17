import { Token, editor } from "monaco-editor";
import { LANG } from "../../SQLEditor";
import { getTokenNesting } from "../getPrevTokensNoParantheses";
import { quickClone } from "../../../../utils";

export type TokenInfo = Pick<Token, "offset"> & {
  type: 
    | "string.sql" 
    | "keyword.sql" 
    | "white.sql" 
    | "identifier.sql" 
    | "identifier.quote.sql" 
    | "operator.sql" 
    | "delimiter.parenthesis.sql"
    | "delimiter.sql" // ","    
    | "predefined.sql" // Usually funcs like MAX / UPDATE
    | "keyword.choice.sql" // WHEN
    | "keyword.block.sql" // CASE
    | "number.sql"
    | "comment.sql"
    | "comment.quote.sql";
  end: number;
  text: string;
  textLC: string;
  lineNumber: number;
  nestingId: string;
};

type GetTokensArgs = {
  eol: string; 
  lines: string[]; 
  startOffset?: number; 
  startLine?: number; 
  currOffset?: number;
  includeComments?: boolean;
};

type GetTokensResult = { 
  tokens: TokenInfo[], 
  isCommenting: boolean; 
};

export const getTokens = ({ 
  eol, 
  lines, 
  startOffset = 0, 
  startLine = 0, 
  currOffset = 0, 
  includeComments = false 
}: GetTokensArgs): GetTokensResult => {
  
  let result: TokenInfo[] = [];
  let isCommenting = false;
  const text = lines.join("\n") + " ";// model.getValue();
  const allTokens = editor.tokenize(text, LANG)
    // .map(ts => ts.filter(t => t.type)); /** Sometimes at the begining the tokens come with no type */

  let lineStartOffset = startOffset;
  allTokens.forEach((lineTokens, lineIdx) => {
    
    if(lineIdx){
      const offSetForEachLineBreak = eol.length;
      lineStartOffset += offSetForEachLineBreak + (lines[lineIdx - 1]?.length ?? 0);
    }

    for(let lineTokenIdx = 0; lineTokenIdx < Math.max(1, lineTokens.length - 1) ; lineTokenIdx++){
      const line = lines[lineIdx];
      const t0 = lineTokens[lineTokenIdx];

      const t1 = lineTokens[lineTokenIdx + 1];

      if(line === undefined) continue;
      
      const end = t1?.offset ?? line.length
      const start = t0?.offset ?? 0;
      const text =  line.slice(start, end);
      const offset = start + lineStartOffset;

      const getType = (tkn: Token | undefined) => tkn?.type as any ?? (["::", "?"].includes(text)? "operator.sql" : "unknown")

      const t: TokenInfo = {
        offset,
        end: offset + text.length,
        text,
        lineNumber: lineIdx + startLine,
        textLC: text.toLowerCase(),
        type: getType(t0),
        nestingId: "",
      }

      const isCurrentToken = t.offset < currOffset && t.end >= currOffset;
      isCommenting = isCommenting || isCurrentToken && t.type.includes("comment");

      result.push(t);

      const isEndOfLine = lineTokenIdx === lineTokens.length - 2;
      if(isEndOfLine) {
        if(t1 && t1.type !== "white.sql"){

          const text = line.slice(t1.offset);
          const offset = t1.offset + lineStartOffset;
  
          const lastT = {
            offset,
            end: offset + text.length,
            text: text,
            lineNumber: t.lineNumber,
            textLC: text.toLowerCase(),
            type: getType(t1),
            nestingId: "",
          }
          result.push(lastT);
        } else {
          // console.log(t1, line)
        }
      }
    }
  });

  result = result.map((t, i) => {
    
    /** Ensure escaped identifiers include end quotes  */
    if(i){
      const prevT = result[i-1];
      const nextT = result[i+1];
      if(t.type === "identifier.sql" && 
        prevT?.text === `"` && prevT.type === "identifier.quote.sql" &&
        nextT?.text === `"` && nextT.type === "identifier.quote.sql"
      ){
        return {
          ...t,
          offset: t.offset - 1,
          end: t.end + 1,
          text: `"${t.text}"`,
          textLC: `"${t.textLC}"`,
        }
      }
    }
    return t;
  }).filter(t => t.type !== "white.sql" && t.type !== "identifier.quote.sql");

  /** Groups:
   *  - schema.identifier tokens into one 
   *  - #> into one
   * */
  let result1: typeof result = [];
  let idx = 0;
  while(result.length && idx < result.length){

    const t = result[idx];
    const t1 = result[idx+1];
    const t2 = result[idx+2];
    if(
      t && t1 && t2 &&
      t.type === "identifier.sql" && t1.text === "." && t2.type === "identifier.sql" && 
      t.end === t1.offset && t1.end === t2.offset
    ){
      result1.push({
        ...t,
        text: [t.text, t1.text, t2.text].join(""),
        textLC: [t.textLC, t1.textLC, t2.textLC].join(""),
        end: t2.end
      });
      idx = idx + 3;
    } else if(
      t && t1 && 
      t.text === "#" && t1.text === ">" &&
      t.end === t1.offset
    ) {
      result1.push({
        ...t,
        text: [t.text, t1.text].join(""),
        textLC: [t.textLC, t1.textLC].join(""),
        end: t1.end
      });
      idx = idx + 2;

    } else if(t) {
      result1.push(t);
      idx++;
    }
  }
   
  result1 = result1.map(t => {
    return {
      ...t,
      type: (t.textLC === "ilike" || t.textLC === "like")? "operator.sql" : t.type
    }
  });
  
  if(!includeComments){
    result1 = result1.filter(t => t.type !== "comment.sql" && t.type !== "comment.quote.sql")
  }
  
  const tokens = getTokenNesting(result1);
  
  return {
    tokens,
    isCommenting
  }
}