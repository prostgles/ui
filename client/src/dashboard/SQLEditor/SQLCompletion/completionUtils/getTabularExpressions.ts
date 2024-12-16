import { getParentFunction, preSubQueryKwds } from "../MatchSelect";
import type {
  ParsedSQLSuggestion,
  SQLMatchContext,
} from "../registerSuggestions";
import type { CodeBlock } from "./getCodeBlock";
import type { GetTableExpressionSuggestionsArgs } from "./getTableExpressionReturnTypes";
import type { TokenInfo } from "./getTokens";

const getAliasToken = (
  tokens: SQLMatchContext["cb"]["tokens"],
  expressionLastTokenIdx: number,
) => {
  if (expressionLastTokenIdx === -1) return;
  const aliasToken = tokens[expressionLastTokenIdx + 1];
  const aliasToken2 = tokens[expressionLastTokenIdx + 2];
  if (aliasToken?.textLC === "as") {
    return aliasToken2;
  }
  if (aliasToken?.type !== "identifier.sql") {
    return undefined;
  }
  return aliasToken;
};

const tablePrecedingKeywords = [
  "from",
  "join",
  "lateral",
  "update",
  /**
   * comma is may be used as an alias for CROSS JOIN
   */
  ",",
] as const;
const withTablePrecedingKeywords = ["as"] as const;
const policyTablePrecedingKeywords = ["on"] as const;
const alterTablePrecedingKeywords = ["table"] as const;
const allTablePrecedingKeywords = [
  ...tablePrecedingKeywords,
  ...withTablePrecedingKeywords,
  ...policyTablePrecedingKeywords,
  ...alterTablePrecedingKeywords,
] as const;

export type TabularExpression = {
  kwd: (typeof allTablePrecedingKeywords)[number];
  alias: string | undefined;
  getQuery: (selectedColumns?: string) => string;
  endOffset: number;
  cteAlias?: string;
} & (
  | {
      type: "function";
      func: ParsedSQLSuggestion;
    }
  | {
      type: "subquery";
    }
  | {
      type: "tableOrView";
      table: ParsedSQLSuggestion;
      columns: ParsedSQLSuggestion[];
    }
);

export const getTabularExpressions = (
  {
    cb: _cb,
    ss,
    parentCb,
  }: Pick<GetTableExpressionSuggestionsArgs, "ss" | "cb" | "parentCb">,
  require: "columns" | "table",
  onlyCurrentBlock = false,
) => {
  let { tokens } = { ..._cb };
  let parentTokensForLateral = tokens.slice(0, 0);
  /** If is in a subquery then ignore parent UNLESS this is a lateral expression */
  if (_cb.currNestingId) {
    const func = getParentFunction(_cb);
    if (func && preSubQueryKwds.includes(func.func.textLC)) {
      if (func.func.textLC === "lateral") {
        parentTokensForLateral = [
          ...tokens.filter((t) => t.offset < func.func.offset),
        ];
      }
      const startTokenIdx = _cb.tokens.findLastIndex((t, i) => {
        const prevToken = _cb.tokens[i - 1];
        return (
          t.offset <= _cb.currOffset &&
          t.nestingId === _cb.currNestingId &&
          prevToken &&
          prevToken.nestingId !== _cb.currNestingId
        );
      });
      const startToken = _cb.tokens[startTokenIdx];
      if (startToken) {
        const lastTokenIdx = _cb.tokens.findIndex((t, i) => {
          const nextToken = _cb.tokens[i - 1];
          const r =
            t.offset > startToken.offset &&
            t.nestingId === _cb.currNestingId &&
            nextToken?.nestingId !== _cb.currNestingId;
          return r;
        });
        tokens = tokens.slice(startTokenIdx, lastTokenIdx).map((t) => ({
          ...t,
          nestingId: t.nestingId.slice(0, -_cb.currNestingId.length),
        }));
      }
    }
  }

  let expressions: TabularExpression[] = [];

  /** If inside a CTE then add previous WITH statement CTE defs (WITH ... update)*/
  if (
    parentCb?.ftoken?.textLC === "with" &&
    parentCb.currNestingId &&
    !onlyCurrentBlock
  ) {
    const pFunc = getParentFunction(parentCb);
    if (pFunc?.func.textLC === "as" && !pFunc.func.nestingId) {
      const prevExpressions = getTabularExpressions(
        { cb: parentCb, ss },
        require,
      ).filter((e) => e.endOffset < parentCb.currOffset);
      expressions = [...prevExpressions];
    }
  }

  expressions = [...expressions, ...getExpressions(tokens, _cb, ss, parentCb)];

  if (parentTokensForLateral.length && require === "columns") {
    expressions = [
      ...expressions,
      ...getExpressions(parentTokensForLateral, _cb, ss, parentCb),
    ];
  }

  return expressions.filter((s) => s.kwd === "from" || s.alias);
};

const getExpressions = (
  tokens: TokenInfo[],
  cb: CodeBlock,
  ss: ParsedSQLSuggestion[],
  parentCb: CodeBlock | undefined,
) => {
  const getQuerySection = (
    firstToken: TokenInfo,
    lastToken: TokenInfo,
    includeEnd = false,
  ) => {
    const textOffset = cb.blockStartOffset;
    return (parentCb ?? cb).text.slice(
      firstToken.offset - textOffset,
      (includeEnd ? lastToken.end : lastToken.offset) - textOffset,
    );
  };
  const getClosingParenthesis = (fromIdx: number) => {
    const closingParenthesesIdx = tokens.findIndex(
      (nt, idx) => idx >= fromIdx && nt.text === ")" && !nt.nestingId,
    );
    const firstToken = tokens[fromIdx];
    const lastToken = tokens[closingParenthesesIdx];
    if (closingParenthesesIdx === -1 || !firstToken || !lastToken) return;
    const aliasToken = getAliasToken(tokens, closingParenthesesIdx);
    return {
      closingParenthesesIdx,
      closingParentheses: lastToken,
      nestedTokens: tokens.slice(fromIdx, closingParenthesesIdx),
      alias: aliasToken?.text,
      aliasToken,
      query: getQuerySection(firstToken, lastToken),
    };
  };

  const expressions: TabularExpression[] = [];
  const isWith = tokens[0]?.textLC === "with";
  const isPolicy = tokens[1]?.textLC === "policy";
  const isIndex = tokens[1]?.textLC === "index";
  const isAlterTable =
    tokens[0]?.textLC === "alter" && tokens[1]?.textLC === "table";
  const indexOrPolicy = isIndex || isPolicy;
  let isWithAsSectionFinished = false;
  tokens.forEach((t, i) => {
    const prevToken = tokens[i - 1];
    const nextToken = tokens[i + 1];
    const tableKeywods = [
      ...tablePrecedingKeywords,
      ...(isAlterTable ? alterTablePrecedingKeywords
      : indexOrPolicy ? policyTablePrecedingKeywords
      : isWith && !isWithAsSectionFinished ? withTablePrecedingKeywords
      : []),
    ];
    if (!isWithAsSectionFinished && t.textLC === "select" && !t.nestingId) {
      isWithAsSectionFinished = true;
    }
    const kwd = tableKeywods.find((v) => v === prevToken?.textLC);

    if (prevToken && !prevToken.nestingId && kwd) {
      /** CTE section finished */
      if (isWith && kwd !== "as" && kwd !== ",") {
        isWithAsSectionFinished = true;
      }

      /** CTE */
      if (isWith && kwd === "as") {
        const prevPrevToken = tokens[i - 2];
        if (!prevPrevToken) return;
        const closing = getClosingParenthesis(i + 1);
        if (!closing) return;

        const getQuery = (selectedColumns = "*") =>
          [
            getQuerySection(tokens[0]!, closing.closingParentheses, true),
            `SELECT ${selectedColumns} FROM ${prevPrevToken.text}`,
          ].join("\n");

        expressions.push({
          type: "subquery",
          kwd,
          ...closing,
          getQuery,
          endOffset: closing.closingParentheses.end,
          alias: prevPrevToken.text,
        });

        /** Function */
      } else if (
        !indexOrPolicy &&
        nextToken?.textLC === "(" &&
        !t.nestingId &&
        !nextToken.nestingId
      ) {
        const [func, ...otherFuncs] = ss.filter(
          (s) => s.type === "function" && s.escapedIdentifier === t.text,
        );
        if (func && !otherFuncs.length) {
          const closing = getClosingParenthesis(i + 2);
          if (!closing) return;
          const getQuery = (selectedColumns = "*") =>
            `SELECT ${selectedColumns} FROM ${t.text}(${closing.query})`;
          expressions.push({
            type: "function",
            kwd,
            func,
            ...closing,
            endOffset: closing.closingParentheses.end,
            getQuery,
          });
        }

        /** Subquery */
      } else if (t.text === "(" && !t.nestingId) {
        const closing = getClosingParenthesis(i + 1);
        if (!closing) return;
        const { aliasToken } = closing;
        let aliasColumnDefinition = "";
        const tokensAfterAlias =
          aliasToken && cb.tokens.filter((t) => t.offset >= aliasToken.end);
        if (tokensAfterAlias?.[0]?.textLC === "(") {
          const closingAliasIndex = tokensAfterAlias.findIndex(
            (t) => t.text === ")" && !t.nestingId,
          );
          if (closingAliasIndex !== -1) {
            aliasColumnDefinition = tokensAfterAlias
              .map((t) => t.text)
              .slice(0, closingAliasIndex + 1)
              .join("");
          }
        }
        let getQuery = (selectedColumns = "*") =>
          `SELECT ${selectedColumns} FROM (${closing.query}) t${aliasColumnDefinition}`;
        /** Lateral allows using previous table columns within the subquery. Must include all previous tables */
        if (kwd === "lateral") {
          const fromKwd = tokens.find(
            (t) => t.textLC === "from" && !t.nestingId,
          );
          if (!fromKwd || fromKwd.offset > t.offset) return;
          if (!aliasToken) return;
          let isWithStart = "";
          if (isWith && isWithAsSectionFinished) {
            const selectKwd = tokens.find(
              (t) => t.textLC === "select" && !t.nestingId,
            );
            const withEndToken = tokens.findLast(
              (t) =>
                selectKwd &&
                t.textLC === ")" &&
                !t.nestingId &&
                t.offset < selectKwd.offset,
            );
            isWithStart =
              !withEndToken ? "" : (
                getQuerySection(tokens[0]!, withEndToken, true) + "\n"
              );
          }
          getQuery = (selectedColumns = `${closing.alias}.*`) =>
            [
              isWithStart,
              `SELECT ${selectedColumns}`,
              getQuerySection(fromKwd, closing.aliasToken!, true),
              "ON TRUE",
            ].join("\n");
        }

        expressions.push({
          type: "subquery",
          kwd,
          ...closing,
          endOffset: closing.closingParentheses.end,
          getQuery,
        });

        /** Table or view or CTE alias */
      } else if (t.type === "identifier.sql" && !t.nestingId) {
        const [matchingTable, ...otherTables] = ss.filter((s) => {
          return (
            ["table", "view", "mview"].includes(s.type) &&
            matchTableFromSuggestions(s as any, t)
          );
        });
        const alias =
          indexOrPolicy || isAlterTable ? undefined : (
            getAliasToken(tokens, i)?.text
          );

        /** Table or view */
        if (matchingTable && !otherTables.length) {
          const columns = ss.filter(
            (s) =>
              s.type === "column" &&
              s.escapedParentName === matchingTable.escapedIdentifier,
          );
          if (columns.length) {
            expressions.push({
              type: "tableOrView",
              kwd,
              table: matchingTable,
              columns,
              endOffset: t.end,
              alias: alias || matchingTable.escapedIdentifier,
              getQuery: (selectedColumns = "*") =>
                `SELECT ${selectedColumns} FROM ${matchingTable.escapedIdentifier} ${alias ? alias : ""}`,
            });
          }
          /** CTE alias */
        } else if (!matchingTable && isWith && isWithAsSectionFinished) {
          const matchingWith = expressions.find(
            (e) => e.alias === t.text && e.kwd === "as",
          );
          if (matchingWith) {
            expressions.push({
              ...matchingWith,
              kwd,
              alias,
              cteAlias: matchingWith.alias,
            });
          }
        }
      }
    }
  });

  return expressions;
};

export const matchTableFromSuggestions = (
  s:
    | { type: "column"; escapedParentName: string; schema: string }
    | {
        type: "table" | "view" | "mview";
        escapedIdentifier: string;
        name: string;
        schema: string;
      },
  t: TokenInfo,
) => {
  const matches =
    s.type === "column" ?
      s.escapedParentName === t.text
    : s.escapedIdentifier === t.text || s.name === t.text;
  if (matches) return matches;
  const s_name = s.type === "column" ? s.escapedParentName : s.name;

  if (t.textParts) {
    if ([s.schema, s_name].join(".") === t.textParts.join(".")) {
      return true;
    }
    const [schema, name] = t.textParts.map((t) =>
      t.startsWith('"') ? t : t.toLowerCase(),
    );
    return [s.schema, s_name].join(".") === [schema, name].join(".");
  }

  return false;
};
