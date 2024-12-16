import type { Monaco } from "../../../W_SQL/monacoEditorTypes";
import { type TokenInfo, getTokens } from "./getTokens";

export type LineInfo = {
  v: string;
  n: number;
  isComment: boolean;
};

type Args = {
  allLines: LineInfo[];
  lineNumber: number;
  currOffset: number;
  offsetLimits?: [number, number];
  eol: string;
  editor: Monaco["editor"];
  startLine: number;
  endLine: number;
};

export const checkIfInsideDollarFunctionDefinition = ({
  allLines,
  lineNumber,
  currOffset,
  offsetLimits,
  editor,
  eol,
  ...limits
}: Args) => {
  /** If inside function select function body so must disregard ";" */
  if (allLines.some((l) => l.v.includes("$"))) {
    let { tokens: allTokens } = getTokens({
      editor,
      eol,
      lines: allLines.map((l) => l.v),
      currOffset,
    });
    if (offsetLimits) {
      const [minOffset, maxOffset] = offsetLimits;
      allTokens = allTokens.filter((t) => {
        return t.offset >= minOffset && t.offset <= maxOffset;
      });
    }

    const funcToken = allTokens
      .filter((t, i) => {
        const prevToken = allTokens[i - 1];
        const nextToken = allTokens[i + 1];
        return (
          !t.nestingId &&
          (t.offset <= currOffset || t.lineNumber === lineNumber) &&
          ((t.textLC === "do" &&
            nextToken &&
            nextToken.textLC.startsWith("$")) ||
            (["function", "procedure"].includes(t.textLC) &&
              prevToken &&
              ["create", "replace"].includes(prevToken.textLC)))
        );
      })
      .at(-1);
    if (funcToken) {
      const firstDollarQuote = allTokens.find(
        (t) =>
          funcToken.offset <= t.offset &&
          t.lineNumber <= limits.endLine &&
          t.text.startsWith("$") &&
          t.text.endsWith("$"),
      );
      const secondDollarQuote = allTokens.find(
        (t) =>
          firstDollarQuote &&
          t.offset > firstDollarQuote.offset &&
          t.text === firstDollarQuote.text,
      );
      if (
        firstDollarQuote &&
        secondDollarQuote &&
        (secondDollarQuote.offset >= currOffset ||
          secondDollarQuote.lineNumber === lineNumber)
      ) {
        return {
          startLine: funcToken.lineNumber,
          endLine: secondDollarQuote.lineNumber,
        };
      }
    }
  }
};
