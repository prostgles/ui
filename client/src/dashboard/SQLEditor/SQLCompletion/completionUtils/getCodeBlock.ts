
import { editor, Position } from "monaco-editor";
import { STARTING_KWDS } from "../KEYWORDS";

import * as monaco from 'monaco-editor';
import { getPrevTokensNoParantheses } from "../getPrevTokensNoParantheses";
import { getTokens, TokenInfo } from "./getTokens";
import { isDefined } from "../../../../utils";


/**
 * Get block of uninterrupted text at cursor position
 * Type of interruptions:
 *    - At least one empty line
 *    - Stop keyword ";"
 */
export type CodeBlock = { 
  startLine: number; 
  endLine: number; 
  lines: { v: string; n: number; }[];
  tokens: TokenInfo[];
  prevTokens: TokenInfo[];
  nextTokens: TokenInfo[];
  thisLinePrevTokens: TokenInfo[];
  currToken?: TokenInfo;
  ltoken?: TokenInfo;
  l1token?: TokenInfo;
  l2token?: TokenInfo;
  l3token?: TokenInfo;
  l4token?: TokenInfo;
  ftoken?: TokenInfo;
  currNestingId: string;
  text: string;
  textLC: string;
  prevLC: string;
  prevText: string;
  nextLC: string;
  thisLineLC: string;
  prevIdentifiers: string[];
  identifiers: string[];
  tableIdentifiers: string[];
  offset: number;
  getPrevTokensNoParantheses: (excludeParantheses?: boolean) => TokenInfo[];
  prevTopKWDs: (Omit<TokenInfo, "text"> & { text: typeof STARTING_KWDS[number]; })[];
  model: editor.ITextModel;
  position: Position;
  isCommenting: boolean;
  currOffset: number;
};

/** Disruptions within function body due to ";"  */
// const isInterrupted = (line: string) => line.trim().includes(";") || line.trim() === "";

export const getCurrentCodeBlock = (model: editor.ITextModel, pos: Position, offsetLimits?: [number, number], smallestBlock = false): CodeBlock => {
  const { lineNumber } = pos;
  const currOffset = model.getOffsetAt(pos);
  /** https://github.com/microsoft/monaco-editor/issues/1225 */
  const eol = model.getEOL();
  let allLines = model.getLinesContent().map((v, i) => ({ v, n: i + 1, isComment: false }));
  const isInterrupted = (line: typeof allLines[number]) => {
    const interrupted = !line.isComment && (line.v.trim() === "" || line.v.trim().endsWith(";"));
    return interrupted;
  };
  
  /** Ignore comments */
  if(allLines.some(l => l.v.includes(`/*`) || l.v.includes(`--`))){
    const { tokens: allTokens } = getTokens({ eol, lines: allLines.map(l => l.v) });
    const commentLineNumbers = Array.from(new Set(allTokens.filter(t => t.type.includes("comment")).map(t => t.lineNumber + 1)));
    allLines = allLines.map(l => {
      const isComment = commentLineNumbers.includes(l.n);
      return {
        ...l, 
        /** If comment then maintain content length for offset but disregard content */
        v: isComment? (l.v.length >= 2? `--${" ".repeat(l.v.length - 2)}` : "") : l.v,
        isComment,
      }
    });
  }

  let endLine = allLines.slice(lineNumber - 1).find(l => l.n > lineNumber && isInterrupted(l))?.n ?? allLines.at(-1)?.n ?? 0;
  let startLine = allLines.slice(0, lineNumber - 1).reverse().find(l => l.n < lineNumber && isInterrupted(l))?.n ?? allLines.at(0)?.n ?? 0;


  /** If inside function select function body so must disregard ";" */
  if(allLines.some(l => l.v.includes("$"))){
    let { tokens: allTokens } = getTokens({ eol, lines: allLines.map(l => l.v), currOffset });
    if(offsetLimits){
      const [minOffset, maxOffset] = offsetLimits;
      allTokens = allTokens.filter(t => {
        return t.offset >= minOffset && t.offset <= maxOffset;
      })
    }

    const funcToken = allTokens.filter(t => t.offset <= currOffset && (["function", "do"].includes(t.textLC)) && t.type === "keyword.sql").at(-1);
    if(funcToken){

      const firstDollarQuote = allTokens.find(t => funcToken.offset <= t.offset && t.offset <= currOffset && t.text.startsWith("$") && t.text.endsWith("$"));
      const secondDollarQuote = allTokens.find(t => firstDollarQuote && t.offset > firstDollarQuote.offset && t.text === firstDollarQuote.text);
      if(firstDollarQuote && secondDollarQuote && secondDollarQuote.offset >= currOffset){
        // const l0Idx = Math.max(0, firstDollarQuote.lineNumber - 1);
        const l0Idx = Math.max(0, funcToken.lineNumber - 1);
        const l1Idx = Math.min(allLines.length - 1, secondDollarQuote.lineNumber - 1);
        
        const l0 = allLines[l0Idx];
        const l1 = allLines[l1Idx];
        // if(!l0 && l0 === 0 && allLines.length){
        //   throw "wtf"
        // }
        if(l0 && l1){
          startLine = l0.n - 1;
          endLine = l1.n + 1;
        }
      }
    }

  }

  const l0 = allLines.find(l => l.n === startLine);
  const l1 = allLines.find(l => l.n === endLine);
   
  /** Skip empty lines */
  if(
    l0 && isInterrupted(l0) && l0.n < lineNumber
  ){
    startLine++
  }
  if(l1 && !l1.v.trim()){ 
    endLine--;
  }
  endLine = Math.max(startLine, endLine);

  const lines = allLines.slice(
    !startLine? 0 : startLine - 1,
    !endLine? 0 : endLine
  );
  const blockStartOffset = model.getOffsetAt({ column: 0, lineNumber: startLine });

  let text = lines.map(l => l.v).join("\n");
  const _tokens = getTokens({ eol, lines: lines.map(l => l.v), startOffset: blockStartOffset, startLine, currOffset })
  let tokens = _tokens.tokens
    .filter(t => t.text); /** Something is adding an empty token to the start */
  if(offsetLimits){
    const [minOffset, maxOffset] = offsetLimits;
    tokens = tokens.filter(t => {
      return t.offset >= minOffset && t.offset <= maxOffset;
    });

    /** If is nested then remove root nesting */
    const [firstToken] = tokens;
    if(firstToken){
      if(tokens.every(t => t.nestingId.startsWith(firstToken.nestingId))){
        tokens = tokens.map(t => ({
          ...t,
          nestingId: t.nestingId.slice(firstToken.nestingId.length)
        }))
      }
    }
  }

  const textLC = tokens.map(t => t.textLC).join(" ").toLowerCase().trim();

  // const cbStartOffset = model.getOffsetAt({ lineNumber: startLine, column: 1 })
  // const offset = modelOffset - cbStartOffset;
  const prevTokens = tokens.filter(t => t.end < currOffset).sort((a, b) => a.offset - b.offset);
  const nextTokens = tokens.filter(t => t.offset >= currOffset).sort((a, b) => a.offset - b.offset);
  const currToken = tokens.find(t => t.offset < currOffset && t.end >= currOffset);
  const thisEntireLineTokens = tokens.filter(t => t.lineNumber === pos.lineNumber).sort((a, b) => a.offset - b.offset);
  const thisLinePrevTokens = thisEntireLineTokens.filter(t => t.end < currOffset);

  const prevLC = prevTokens.map(t => t.textLC).join(" ").toLowerCase().trim();
  const nextLC = nextTokens.map(t => t.textLC).join(" ").toLowerCase().trim();
  const thisLineLC = thisEntireLineTokens.map(t => t.textLC).join(" ").toLowerCase().trim();

  const ftoken = prevTokens.at(0);
  const ltoken = prevTokens.at(-1);
  const l1token = prevTokens.at(-2);
  const l2token = prevTokens.at(-3);
  const l3token = prevTokens.at(-4);
  const l4token = prevTokens.at(-5);

  let prevText = model.getValueInRange({
    startColumn: 0,
    startLineNumber: startLine,
    endLineNumber: pos.lineNumber,
    endColumn: pos.column,
  });
  if(offsetLimits){
    const startPos = model.getPositionAt(offsetLimits[0]);
    const endPos = model.getPositionAt(offsetLimits[1]);
    startLine = startPos.lineNumber;
    endLine = endPos.lineNumber;
    text = model.getValueInRange({
      startColumn: startPos.column,
      startLineNumber: startPos.lineNumber,
      endColumn: endPos.column,
      endLineNumber: endPos.lineNumber,
    });
    prevText = model.getValueInRange({
      startColumn: startPos.column,
      startLineNumber: startPos.lineNumber,
      endLineNumber: pos.lineNumber,
      endColumn: pos.column,
    });
  }

  const prevIdentifiers = prevTokens.filter(t => t.type === "identifier.sql").map(t => t.text);
  
  // const identifiers = tokens.filter(t => t.type === "identifier.sql").map(t => t.text);
  const _identifiers = tokens.map((t, i, arr)=> {
    if(t.type !== "identifier.sql"){
      return undefined;
    }
    /* Ignore create statement new names */
    if(arr[0]?.textLC === "create" && (i === 2 || arr[4]?.textLC === "exists" && i === 5)){
      return undefined
    }
    const prevT = arr[i-1];
    const tableKeyords = ["from", "join", "table", "on", "update", "truncate", "insert into", "analyze", "copy", "into"];
    return { 
      type: tableKeyords.includes(prevT?.textLC as any)? "table" as const : undefined,  
      value: t.text
    };
  }).filter(isDefined);
  const identifiers = _identifiers.map(d => d.value);
  const tableIdentifiers = _identifiers.filter(d => d.type === "table").map(d => d.value);

  const currLtoken = currToken ?? ltoken;
  const [nextToken] = nextTokens;

  const currNestingId = currLtoken?.text === "(" && nextToken?.text === ")"? `${currLtoken.nestingId}1` :
    nextToken?.text === ")" && currLtoken? currLtoken.nestingId :
    currLtoken?.text === "("? `${currLtoken.nestingId}1` : !nextToken? 
    "" : 
    currToken?.nestingId ?? tokens.find(t => [t.offset, t.end].includes(currOffset))?.nestingId ?? ltoken?.nestingId ?? "";
  
  const { isCommenting } = getTokens({ eol, lines: model.getLinesContent(), includeComments: true, currOffset });

  const result = {
    get prevTopKWDs (){
      return getPrevTokensNoParantheses(prevTokens, true).slice(0).reverse().filter(t => 
        STARTING_KWDS.find(kwd => 
          ["keyword.sql", "identifier.sql", "predefined.sql"].includes(t.type) && !t.text.includes('"') && t.textLC === kwd.toLowerCase()
        )
      ).map(t => ({
        ...t,
        text: t.text.toUpperCase() as typeof STARTING_KWDS[number]
      }));
    },
    prevText,
    startLine,
    endLine,
    text,
    textLC,
    prevLC,
    nextLC,
    thisLineLC,
    thisLinePrevTokens,
    lines,
    tokens,
    prevTokens,
    nextTokens,
    currToken,
    ftoken,
    l4token,
    l3token,
    l2token,
    l1token,
    ltoken,
    prevIdentifiers,
    currNestingId,
    identifiers,
    tableIdentifiers,
    getPrevTokensNoParantheses: (excludeParantheses?: boolean) => getPrevTokensNoParantheses(prevTokens, excludeParantheses),
    offset: currOffset,
    model,
    position: pos,
    isCommenting,
    currOffset,
  }
  
  if(smallestBlock && !offsetLimits && currNestingId){
    const smallestBlockoffsetLimits = getCurrentNestingOffsetLimits({ currNestingId, currOffset, tokens })
    
    if(smallestBlockoffsetLimits && !smallestBlockoffsetLimits.isEmpty){
      const smallestCb = getCurrentCodeBlock(model, pos, smallestBlockoffsetLimits.limits);
      return smallestCb;
    }
  }
  
  return result;
}


export const getCurrentNestingOffsetLimits = ({ currNestingId, currOffset, tokens }: Pick<CodeBlock, "currNestingId" | "tokens" | "currOffset">): { limits: [number, number]; isEmpty: boolean; } | undefined => {

  const isInsideCurrentNestingId = (t: TokenInfo, i: number, arr: TokenInfo[]) => {
    const pToken = arr[i-1];
    const nToken = arr[i+1];
    const isParens = nToken?.type === "delimiter.parenthesis.sql";
    const isExitingNesting = !nToken || nToken.nestingId.length < currNestingId.length;
    const isSameNesting = t.nestingId.startsWith(currNestingId) && (!pToken || pToken.nestingId.startsWith(currNestingId));
    return isParens && isSameNesting && isExitingNesting;
  }
  const startTokens = tokens.slice(0).filter(t => t.offset <= currOffset).reverse()
  const startTokenIdx = startTokens.findIndex(isInsideCurrentNestingId);
  const startToken = startTokens[startTokenIdx];
  const endTokens = tokens.filter(t => t.offset >= currOffset || t.end === currOffset);
  if((!endTokens.length || endTokens[0]?.text === ")" && endTokens[0].nestingId === currNestingId.slice(0, -1)) && startTokenIdx > 0){
    endTokens.unshift(startTokens[0]!);
  }
  const endToken = endTokens.find(isInsideCurrentNestingId);
  const allowedCommands = ["select", "update", "delete", "insert"]
  if(startToken?.type === "keyword.sql" && endToken && allowedCommands.includes(startToken.textLC)){
    return { 
      limits: [startToken.offset, endToken.end], 
      isEmpty: false, 
    }
  } else if(startTokens[0]?.text === "(" && endTokens[0]?.text === ")"){
    return {
      limits: [startTokens[0].end + 1, endTokens[0].offset - 1],
      isEmpty: true,
    }
  }
}


/**
 * Keywords used in determining suggestions
 */
export const MAIN_KEYWORDS = ["JOIN", "SELECT", "ON", "CREATE", "TABLE", "SET", "UPDATE", "INTO", "FROM", "WHERE", ";", "\n", "ALTER", "COPY", "REFRESH", "REINDEX", "GRANT", "REVOKE"] as const;


export const highlightCurrentCodeBlock = ( editor: editor.IStandaloneCodeEditor, curCodeBlock?: CodeBlock) => {  
  
  const noDecor = !curCodeBlock || editor.getModel()?.getValueInRange(editor.getSelection()!);
  return editor.createDecorationsCollection(
    noDecor? [] : [
      {
        range: new monaco.Range(curCodeBlock.startLine, 1, curCodeBlock.endLine, 1),
        options: {
          isWholeLine: false,
          linesDecorationsClassName: 'active-code-block-decoration',
          // hoverMessage: { value: "**Code block**\n\nOnly this section of the script will be executed unless text is selected.This behaviour can be changed in options\n\nExecute commands: ctrl+e, alt+e",  }
          // glyphMarginClassName: 'myLineDecoration',
          // glyphMarginHoverMessage: { value: "**Code block**\n\nOnly this section of the script will be executed unless text is selected.This behaviour can be changed in options\n\nExecute commands: ctrl+e, alt+e",  }
          
        }
      }
    ]
  ); 
}
 