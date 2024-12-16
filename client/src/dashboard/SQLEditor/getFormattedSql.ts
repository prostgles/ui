import type { editor } from "monaco-editor";
import { getMonaco } from "./SQLEditor";
import {
  type TokenInfo,
  getTokens,
} from "./SQLCompletion/completionUtils/getTokens";

const getNestingInfo = (
  tokens: TokenInfo[],
  nestingId: string,
  isStart: boolean,
) => {
  let nestingLength = 0;
  let nestingContainedKeywords = false;

  const tokensOrdered = isStart ? [...tokens] : [...tokens].reverse();

  tokensOrdered.findIndex((_t, i) => {
    nestingContainedKeywords =
      nestingContainedKeywords || _t.type === "keyword.sql";
    const nextToken = tokensOrdered[i + 1];
    nestingLength += _t.text.length;
    return (
      nextToken?.text === (isStart ? ")" : "(") && _t.nestingId === nestingId
    );
  });

  return {
    nestingLength,
    nestingContainedKeywords,
  };
};

export const getFormattedSql = async (model: editor.ITextModel) => {
  const lines = model.getLinesContent();
  const editor = (await getMonaco()).editor;
  const eol = model.getEOL();
  const { tokens } = getTokens({ lines, eol, editor, includeComments: true });
  let lastKwdToken: TokenInfo | undefined;
  const newText = tokens
    .map((t, i) => {
      const prevToken = tokens[i - 1];
      const nextToken = tokens[i + 1];
      const newLineKeywords = [
        "do",
        "declare",
        "for",
        "begin",
        "set",
        "create",
        "alter",
        "drop",
        "truncate",
        "insert",
        "update",
        "delete",
        "with",
        "grant",
        "select",
        "from",
        "where",
        "group",
        "having",
        "order",
        "limit",
        "offset",
        "union",
        "intersect",
        "except",
        "on",
        "join",
        "left",
        "right",
        "full",
        "cross",
        "natural",
        "inner",
      ];
      const newLineOperators = ["and", "or", "exists"];
      const noPrevSpaceSymbols = ["(", ")", ",", "[", "]", "{", "}", "."];
      const currNestingSpaces = "  ".repeat(
        t.nestingId.length + t.funcNestingId.length,
      );
      const withNewline = () => `${eol}${currNestingSpaces}${t.text}`;

      if (t.text === ";" && (!t.nestingId || t.funcNestingId)) {
        return `${t.text}${eol.repeat(t.funcNestingId ? 1 : 2)}${currNestingSpaces}`;
      }

      if (t.text === ")" && prevToken?.nestingId) {
        const { nestingLength, nestingContainedKeywords } = getNestingInfo(
          tokens.slice(0, i + 1),
          prevToken.nestingId,
          false,
        );
        if (nestingLength > 40 || nestingContainedKeywords) {
          return withNewline();
        }
      }

      const needsNewLine =
        t.textLC === "loop" && nextToken?.textLC === ";" ? undefined
        : (
          (t.type === "keyword.sql" || t.type === "operator.sql") &&
          newLineKeywords.includes(t.textLC)
        ) ?
          "kwd"
        : t.type === "operator.sql" && newLineOperators.includes(t.textLC) ?
          "op"
        : undefined;
      if (needsNewLine) {
        if (needsNewLine === "kwd") {
          lastKwdToken = t;
        } else {
          if (tokens.at(i - 2)?.textLC === "between") {
            return ` ${t.text}`;
          }
        }
        return withNewline();
      }
      if (lastKwdToken?.textLC === "select" && t.text === ",") {
        return "," + eol + currNestingSpaces;
      }

      let addPrevSpace = !noPrevSpaceSymbols.includes(t.text);
      if (
        (prevToken?.type === "keyword.sql" ||
          (prevToken && ["in", "exists"].includes(prevToken.textLC))) &&
        t.text === "("
      ) {
        addPrevSpace = true;
      }
      if (t.text === "*" && prevToken?.text === "(") {
        addPrevSpace = false;
      }
      if (prevToken?.text === "(") {
        const { nestingLength, nestingContainedKeywords } = getNestingInfo(
          tokens.slice(i - 1),
          t.nestingId,
          true,
        );
        if (nestingLength > 50 || nestingContainedKeywords) {
          return withNewline();
        }
      }
      if (t.funcNestingId && !nextToken?.funcNestingId) {
        addPrevSpace = false;
      }
      return addPrevSpace ? ` ${t.text}` : t.text;
    })
    .join("");

  return newText;
};
