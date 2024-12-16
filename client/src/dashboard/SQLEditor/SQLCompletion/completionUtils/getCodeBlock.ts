import type { editor, Position } from "../../../W_SQL/monacoEditorTypes";
import { STARTING_KWDS } from "../KEYWORDS";

import { getPrevTokensNoParantheses } from "../getPrevTokensNoParantheses";
import type { TokenInfo } from "./getTokens";
import { getTokens } from "./getTokens";
import { isDefined } from "../../../../utils";
import { getMonaco } from "../../SQLEditor";
import { checkIfInsideDollarFunctionDefinition } from "./checkIfInsideDollarFunctionDefinition";
import { checkIfUnfinishedParenthesis } from "./checkIfUnfinishedParenthesis";

/**
 * Get block of uninterrupted text at cursor position
 * Type of interruptions:
 *    - At least one empty line
 *    - Stop keyword ";"
 */
export type CodeBlock = {
  startLine: number;
  endLine: number;
  lines: { v: string; n: number }[];
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
  currNestingFunc: TokenInfo | undefined;
  text: string;
  textLC: string;
  prevLC: string;
  prevText: string;
  nextLC: string;
  thisLine: string;
  thisLineLC: string;
  prevIdentifiers: TokenInfo[];
  identifiers: TokenInfo[];
  tableIdentifiers: TokenInfo[];
  offset: number;
  getPrevTokensNoParantheses: (excludeParantheses?: boolean) => TokenInfo[];
  prevTopKWDs: (Omit<TokenInfo, "text"> & {
    text: (typeof STARTING_KWDS)[number];
  })[];
  model: editor.ITextModel;
  position: Position;
  isCommenting: boolean;
  currOffset: number;
  /**
   * Start offset of the block
   */
  blockStartOffset: number;
};

/** Disruptions within function body due to ";"  */
// const isInterrupted = (line: string) => line.trim().includes(";") || line.trim() === "";

type GetCurrentCodeBlockOpts = {
  smallestBlock?: boolean;
  expandFrom?: {
    startLine: number;
    endLine: number;
  };
};
/**
 * Get block of uninterrupted sql code around cursor position
 */
export const getCurrentCodeBlock = async (
  model: editor.ITextModel,
  pos: Position,
  offsetLimits?: [number, number],
  { smallestBlock = false, expandFrom }: GetCurrentCodeBlockOpts = {},
): Promise<CodeBlock> => {
  const { lineNumber } = pos;
  const currOffset = model.getOffsetAt(pos);
  /** https://github.com/microsoft/monaco-editor/issues/1225 */
  const eol = model.getEOL();
  let allLines = model
    .getLinesContent()
    .map((v, i) => ({ v, n: i + 1, isComment: false }));
  const isInterrupted = (
    line: (typeof allLines)[number],
    type: "empty" | "ended",
  ) => {
    const interrupted =
      !line.isComment &&
      (type === "empty" ? line.v.trim() === "" : line.v.trim().endsWith(";"));
    return interrupted;
  };
  const editor = (await getMonaco()).editor;
  /** Ignore comments */
  if (allLines.some((l) => l.v.includes(`/*`) || l.v.includes(`--`))) {
    const { tokens: allTokens } = getTokens({
      editor,
      eol,
      lines: allLines.map((l) => l.v),
    });
    const commentLineNumbers = Array.from(
      new Set(
        allTokens
          .filter((t) => t.type.includes("comment"))
          .map((t) => t.lineNumber + 1),
      ),
    );
    allLines = allLines.map((l) => {
      const isComment = commentLineNumbers.includes(l.n);
      return {
        ...l,
        /** If comment then maintain content length for offset but disregard content */
        v:
          isComment ?
            l.v.length >= 2 ?
              `--${" ".repeat(l.v.length - 2)}`
            : ""
          : l.v,
        isComment,
      };
    });
  }

  const isCodeBlockEdge = (
    line: (typeof allLines)[number],
    nextLine: (typeof allLines)[number] | undefined,
    isEnd: boolean,
  ) => {
    const nextLineIsInterrupted = !nextLine || isInterrupted(nextLine, "empty");
    if (!isEnd && line.n === lineNumber) {
      return nextLineIsInterrupted || isInterrupted(nextLine, "ended");
    }
    const isCbEdge =
      (isEnd ? line.n >= lineNumber : line.n <= lineNumber) &&
      (isInterrupted(line, "ended") ||
        (!isEnd && isInterrupted(line, "empty")) || // isEnd=false starts at next line
        nextLineIsInterrupted);
    return isCbEdge;
  };
  let startLineNumber =
    allLines
      .slice(0, lineNumber)
      .reverse()
      .find((l, i, arr) => isCodeBlockEdge(l, arr[i + 1], false))?.n ??
    allLines.at(0)?.n ??
    1;
  let endLineNumber =
    allLines
      .slice(lineNumber - 1)
      .find((l, i, arr) => isCodeBlockEdge(l, arr[i + 1], true))?.n ??
    allLines.at(-1)?.n ??
    1;

  /** If inside function select function body so must disregard ";" */
  const funcLimits = checkIfInsideDollarFunctionDefinition({
    lineNumber: pos.lineNumber,
    allLines,
    currOffset,
    offsetLimits,
    editor,
    eol,
    startLine: startLineNumber,
    endLine: endLineNumber,
  });
  if (funcLimits) {
    startLineNumber = funcLimits.startLine;
    endLineNumber = funcLimits.endLine;
  }

  /** If inside create table parenthesis */
  const nestingLimits = checkIfUnfinishedParenthesis({
    allLines,
    startLineNumber,
    endLineNumber,
  });
  if (nestingLimits) {
    startLineNumber = nestingLimits.startLineNumber;
    endLineNumber = nestingLimits.endLineNumber;
  }

  const startLine = allLines.find((l) => l.n === startLineNumber);
  const endLine = allLines.find((l) => l.n === endLineNumber);

  /** Skip empty lines */
  if (
    startLine &&
    (isInterrupted(startLine, "empty") || startLine.v.trim().endsWith(";")) &&
    startLine.n < lineNumber
  ) {
    startLineNumber++;
  }
  if (endLine && !endLine.v.trim() && endLineNumber !== lineNumber) {
    endLineNumber--;
  }
  endLineNumber = Math.max(startLineNumber, endLineNumber);

  const lines = allLines.slice(
    !startLineNumber ? 0 : startLineNumber - 1,
    !endLineNumber ? 0 : endLineNumber,
  );
  const blockStartOffset = model.getOffsetAt({
    column: 0,
    lineNumber: startLineNumber,
  });

  const _tokens = getTokens({
    editor,
    eol,
    lines: lines.map((l) => l.v),
    startOffset: blockStartOffset,
    startLine: startLineNumber,
    currOffset,
  });
  let { text } = _tokens;
  let tokens = _tokens.tokens.filter(
    (t) => t.text,
  ); /** Something is adding an empty token to the start */

  if (offsetLimits) {
    const [minOffset, maxOffset] = offsetLimits;
    tokens = tokens.filter((t) => {
      return t.offset >= minOffset && t.end <= maxOffset;
    });

    /** If is nested then remove root nesting */
    const [firstToken] = tokens;
    if (firstToken) {
      if (tokens.every((t) => t.nestingId.startsWith(firstToken.nestingId))) {
        tokens = tokens.map((t) => ({
          ...t,
          nestingId: t.nestingId.slice(firstToken.nestingId.length),
        }));
      }
    }
  }

  const textLC = tokens
    .map((t) => t.textLC)
    .join(" ")
    .toLowerCase()
    .trim();

  // const cbStartOffset = model.getOffsetAt({ lineNumber: startLine, column: 1 })
  // const offset = modelOffset - cbStartOffset;
  const prevTokens = tokens
    .filter((t) => t.end < currOffset)
    .sort((a, b) => a.offset - b.offset);
  const nextTokens = tokens
    .filter((t) => t.offset >= currOffset)
    .sort((a, b) => a.offset - b.offset);
  const currToken = tokens.find(
    (t) => t.offset < currOffset && t.end >= currOffset,
  );
  const thisEntireLineTokens = tokens
    .filter((t) => t.lineNumber === pos.lineNumber)
    .sort((a, b) => a.offset - b.offset);
  const thisLinePrevTokens = thisEntireLineTokens.filter(
    (t) => t.end < currOffset,
  );

  const prevLC = prevTokens
    .map((t) => t.textLC)
    .join(" ")
    .toLowerCase()
    .trim();
  const nextLC = nextTokens
    .map((t) => t.textLC)
    .join(" ")
    .toLowerCase()
    .trim();
  const thisLineLC = thisEntireLineTokens
    .map((t) => t.textLC)
    .join(" ")
    .toLowerCase()
    .trim();

  const ftoken = tokens.at(0);
  const ltoken = prevTokens.at(-1);
  const l1token = prevTokens.at(-2);
  const l2token = prevTokens.at(-3);
  const l3token = prevTokens.at(-4);
  const l4token = prevTokens.at(-5);

  let prevText = model.getValueInRange({
    startColumn: 0,
    startLineNumber: startLineNumber,
    endLineNumber: pos.lineNumber,
    endColumn: pos.column,
  });
  if (offsetLimits) {
    const startPos = model.getPositionAt(offsetLimits[0]);
    const endPos = model.getPositionAt(offsetLimits[1]);
    startLineNumber = startPos.lineNumber;
    endLineNumber = endPos.lineNumber;
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

  const prevIdentifiers = prevTokens.filter((t) => t.type === "identifier.sql");

  // const identifiers = tokens.filter(t => t.type === "identifier.sql").map(t => t.text);
  const _identifiers = tokens
    .map((t, i, arr) => {
      if (t.type !== "identifier.sql") {
        return undefined;
      }
      /* Ignore create statement new names */
      if (
        arr[0]?.textLC === "create" &&
        (i === 2 || (arr[4]?.textLC === "exists" && i === 5))
      ) {
        return undefined;
      }
      const prevT = arr[i - 1];
      const tableKeyords = [
        "from",
        "join",
        "table",
        "on",
        "update",
        "truncate",
        "insert into",
        "analyze",
        "copy",
        "into",
        "cluster",
      ];
      return {
        type:
          tableKeyords.includes(prevT?.textLC as any) ?
            ("table" as const)
          : undefined,
        t,
      };
    })
    .filter(isDefined);
  const identifiers = _identifiers.map((d) => d.t);
  const tableIdentifiers = _identifiers
    .filter((d) => d.type === "table")
    .map((d) => d.t);

  const currLtoken = currToken ?? ltoken;
  const [nextToken] = nextTokens;

  const currNestingId =
    currLtoken?.text === "(" && nextToken?.text === ")" ?
      `${currLtoken.nestingId}1`
    : nextToken?.text === ")" && currLtoken ? currLtoken.nestingId
    : currLtoken?.text === "(" ? `${currLtoken.nestingId}1`
    : !nextToken ? ""
    : (currToken?.nestingId ??
      tokens.find((t) => [t.offset, t.end].includes(currOffset))?.nestingId ??
      ltoken?.nestingId ??
      "");
  const currNestingFunc =
    currLtoken?.text === "(" ?
      tokens
        .slice(0)
        .reverse()
        .find((_, i, arr) => arr[i - 1]?.offset === currLtoken.offset)
    : currLtoken?.nestingFuncToken;

  const { isCommenting } = getTokens({
    editor,
    eol,
    lines: model.getLinesContent(),
    includeComments: true,
    currOffset,
  });

  // const thisLine = allLines[pos.lineNumber-1]?.v ?? model.getLineContent(pos.lineNumber)
  const thisLine = model.getLineContent(pos.lineNumber);
  const result = {
    get prevTopKWDs() {
      return getPrevTokensNoParantheses(prevTokens, true)
        .slice(0)
        .reverse()
        .filter((t) =>
          STARTING_KWDS.find(
            (kwd) =>
              ["keyword.sql", "identifier.sql", "predefined.sql"].includes(
                t.type,
              ) &&
              !t.text.includes('"') &&
              t.textLC === kwd.toLowerCase(),
          ),
        )
        .map((t) => ({
          ...t,
          text: t.text.toUpperCase() as (typeof STARTING_KWDS)[number],
        }));
    },
    prevText,
    blockStartOffset,
    startLine: startLineNumber,
    endLine: endLineNumber,
    text,
    textLC,
    prevLC,
    nextLC,
    thisLine,
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
    currNestingFunc,
    identifiers,
    tableIdentifiers,
    getPrevTokensNoParantheses: (excludeParantheses?: boolean) =>
      getPrevTokensNoParantheses(prevTokens, excludeParantheses),
    offset: currOffset,
    model,
    position: pos,
    isCommenting,
    currOffset,
  };

  if (smallestBlock && !offsetLimits && currNestingId) {
    const cbCurrOffset =
      expandFrom ?
        model.getOffsetAt({ lineNumber: expandFrom.startLine, column: 1 })
      : currOffset;
    const cbNestingId = expandFrom ? currNestingId.slice(0, -1) : currNestingId;
    const smallestBlockoffsetLimits = getCurrentNestingOffsetLimits({
      currNestingId: cbNestingId,
      currOffset: cbCurrOffset,
      tokens,
    });

    if (smallestBlockoffsetLimits && !smallestBlockoffsetLimits.isEmpty) {
      const smallestCb = await getCurrentCodeBlock(
        model,
        pos,
        smallestBlockoffsetLimits.limits,
      );
      return smallestCb;
    }
  }
  return result;
};

export const getCurrentNestingOffsetLimits = (
  {
    currNestingId: cn,
    currOffset,
    tokens,
  }: Pick<CodeBlock, "currNestingId" | "tokens" | "currOffset">,
  nestingId?: string,
): { limits: [number, number]; isEmpty: boolean } | undefined => {
  const currNestingId = nestingId ?? cn;
  const isInsideCurrentNestingId = (
    t: TokenInfo,
    i: number,
    arr: TokenInfo[],
  ) => {
    const pToken = arr[i - 1];
    const nToken = arr[i + 1];
    const isParens = nToken?.type === "delimiter.parenthesis.sql";
    const isExitingNesting =
      !nToken || nToken.nestingId.length < currNestingId.length;
    const isSameNesting =
      t.nestingId.startsWith(currNestingId) &&
      (!pToken || pToken.nestingId.startsWith(currNestingId));
    const foundEnd = isParens && isSameNesting && isExitingNesting;
    return foundEnd;
  };
  const startTokens = tokens
    .slice(0)
    .filter((t) => t.offset <= currOffset)
    .reverse();
  const startTokenIdx = startTokens.findIndex(isInsideCurrentNestingId);
  let startToken = startTokens[startTokenIdx];
  if (
    startTokens[0]?.text === "(" &&
    startTokens[0].nestingId.length < currNestingId.length
  ) {
    startToken = undefined;
  }
  const firstBefore = tokens.slice(0).findLast((t) => t.end <= currOffset);
  const firstAfter = tokens.slice(0).find((t) => t.offset >= currOffset);
  /** Is inside empty brackets */
  if (
    firstBefore?.text === "(" &&
    firstAfter?.text === ")" &&
    firstBefore.end <= currOffset &&
    firstAfter.end >= currOffset &&
    firstBefore.nestingId.length < currNestingId.length &&
    firstAfter.nestingId.length < currNestingId.length
  ) {
    return undefined;
  }
  const endTokens = tokens.filter(
    (t) => t.offset >= currOffset || t.end === currOffset,
  );
  /** If cursor is near end parens then must find the token just before cursor */
  if (
    (!endTokens.length ||
      (endTokens[0]?.text === ")" &&
        endTokens[0].nestingId.length < currNestingId.length)) &&
    startTokenIdx >= 0 &&
    firstBefore
  ) {
    endTokens.unshift(firstBefore);
  }
  const endToken = endTokens.find(isInsideCurrentNestingId);
  const allowedCommands = ["select", "update", "delete", "insert"];
  if (
    startToken?.type === "keyword.sql" &&
    endToken &&
    allowedCommands.includes(startToken.textLC)
  ) {
    return {
      limits: [startToken.offset, endToken.end],
      isEmpty: false,
    };
  } else if (startTokens[0]?.text === "(" && endTokens[0]?.text === ")") {
    return {
      limits: [startTokens[0].end + 1, endTokens[0].offset - 1],
      isEmpty: true,
    };
  }
};

/**
 * Keywords used in determining suggestions
 */
export const MAIN_KEYWORDS = [
  "JOIN",
  "SELECT",
  "ON",
  "CREATE",
  "TABLE",
  "SET",
  "UPDATE",
  "INTO",
  "FROM",
  "WHERE",
  ";",
  "\n",
  "ALTER",
  "COPY",
  "REFRESH",
  "REINDEX",
  "GRANT",
  "REVOKE",
] as const;

export const playButtonglyphMarginClassName = "active-code-block-play";
export const highlightCurrentCodeBlock = async (
  editor: editor.IStandaloneCodeEditor,
  currCodeBlock?: CodeBlock,
) => {
  const codeBlockId =
    currCodeBlock ?
      ["L", currCodeBlock.startLine, currCodeBlock.endLine].join("-")
    : "";
  const monaco = await getMonaco();
  const model = editor.getModel();
  const selection = editor.getSelection();
  const modelContainsSelection = Boolean(
    selection && model?.getValueInRange(selection),
  );
  const noDecor = !currCodeBlock || modelContainsSelection;
  return editor.createDecorationsCollection(
    noDecor ?
      []
    : [
        {
          range: new monaco.Range(
            currCodeBlock.startLine,
            1,
            currCodeBlock.endLine,
            1,
          ),
          options: {
            isWholeLine: true,
            linesDecorationsClassName: [
              "active-code-block-decoration",
              codeBlockId,
            ].join(" "),
            glyphMarginClassName:
              currCodeBlock.textLC ? playButtonglyphMarginClassName : undefined,
            // glyphMarginHoverMessage: {
            //   value: "**Run this statement**\n\nOnly this section of the script will be executed unless text is selected. This behaviour can be changed in options\n\nExecute hot keys: ctrl+e, alt+e",
            // }
          },
        },
      ],
  );
};
