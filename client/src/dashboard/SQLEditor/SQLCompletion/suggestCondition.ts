import { suggestSnippets } from "./CommonMatchImports";
import { getParentFunction } from "./MatchSelect";
import { matchNested } from "./MatchWith";
import { getTableExpressionSuggestions } from "./completionUtils/getTableExpressionReturnTypes";
import type { TokenInfo } from "./completionUtils/getTokens";
import { jsonbPathSuggest } from "./jsonbPathSuggest";
import {
  getKind,
  type SQLMatchContext,
  type SQLMatcherResultArgs,
  type SQLMatcherResultType,
} from "./monacoSQLSetup/registerSuggestions";
import { suggestColumnLike } from "./suggestColumnLike";
import { suggestFuncArgs } from "./suggestFuncArgs";
import { allowedOperands, suggestValue } from "./suggestValue";

export const suggestCondition = async (
  args: SQLMatchContext & Pick<SQLMatcherResultArgs, "parentCb">,
  isCondition = false,
): Promise<SQLMatcherResultType | undefined> => {
  const { cb, ss, sql, parentCb, setS } = args;
  const {
    ltoken,
    l1token,
    l2token,
    prevText,
    thisLineLC,
    getPrevTokensNoParantheses,
  } = cb;
  const prevTokens = getPrevTokensNoParantheses(true);
  const keywordsThatActAsIdentifiersWhenInSelect = ["type"];
  const prevKwdTokens = [...prevTokens].reverse().filter((t, i, arr) => {
    const nextToken = arr[i + 1];
    const isKwd =
      (["keyword.choice.sql", "keyword.sql"].includes(t.type) &&
        nextToken?.textLC !== "::") ||
      t.textLC === "join";
    if (cb.ftoken?.textLC === "select") {
      return (
        isKwd && !keywordsThatActAsIdentifiersWhenInSelect.includes(t.textLC)
      );
    }
    return isKwd;
  });
  const prevKwdToken = prevKwdTokens[0];

  const func = getParentFunction(cb);
  if (func?.func.textLC === "exists") {
    if (cb.l1token?.textLC === cb.currNestingFunc?.textLC) {
      return suggestSnippets([{ label: "SELECT" }]);
    }
    const res = await matchNested(args, ["MatchSelect"], undefined);
    if (res) return res;
  }

  const conditionPrecedingKeywords = [
    "where",
    "on",
    "having",
    "when",
    "using",
    "check",
  ];
  if (conditionPrecedingKeywords.includes(prevKwdToken?.textLC ?? "") && func) {
    const funcSuggestions = await suggestFuncArgs({
      cb,
      parentCb,
      ss,
      setS,
      sql,
    });
    if (funcSuggestions) {
      return funcSuggestions;
    }
  }

  const parensConditionKwd =
    (
      prevTokens.some((t) =>
        ["policy", "publication", "subscription"].includes(t.textLC),
      )
    ) ?
      ["using", "check", "where"].find((kwd) => kwd === prevKwdToken?.textLC)
    : undefined;
  const expectsCondition =
    isCondition ||
    !!parensConditionKwd ||
    prevKwdToken?.textLC === "where" ||
    prevKwdToken?.textLC === "when" ||
    (prevKwdToken?.textLC === "on" &&
      prevTokens.some((t) => t.textLC === "join") &&
      cb.thisLinePrevTokens.length);

  const getPrevCol = async (colName: string | undefined) => {
    if (!colName) return undefined;
    const expr = await getTableExpressionSuggestions(
      { parentCb, cb, ss, sql },
      "columns",
    );
    const col = expr.columnsWithAliasInfo.find(({ alias, s }) =>
      [s.escapedIdentifier, `${alias}.${s.escapedIdentifier}`].includes(
        colName,
      ),
    );
    return col?.s;
  };
  const suggestColumnByType = async (prevColToken?: TokenInfo) => {
    const colLike = await suggestColumnLike({ cb, ss, parentCb, setS, sql });
    if (
      (ltoken?.type === "operator.sql" && l1token?.type === "identifier.sql") ||
      prevColToken
    ) {
      const prevCol = await getPrevCol(prevColToken?.text ?? l1token!.text);
      if (prevCol) {
        return {
          suggestions: colLike.suggestions.map((s) => ({
            ...s,
            sortText:
              s.colInfo ?
                s.colInfo.data_type === prevCol.colInfo?.data_type ?
                  "a"
                : "b"
              : s.funcInfo?.restype === prevCol.colInfo?.data_type ? "c"
              : s.sortText,
          })),
        };
      }
    }
    const needsParens =
      !cb.currToken &&
      parensConditionKwd &&
      ltoken?.textLC === parensConditionKwd;
    if (needsParens) {
      return {
        suggestions: colLike.suggestions.map((s) => ({
          ...s,
          insertText: `(${s.insertText} $0 )`,
        })),
      };
    }
    return colLike;
  };

  /**
   * Skip this case so it ends up in MatchWith and the nested logic is parsed
   */
  const isCOmingFromMatchFirstAndIsWithCte =
    cb.currNestingFunc?.textLC === "as" && cb.ftoken?.textLC === "with";
  if (isCOmingFromMatchFirstAndIsWithCte) {
    return undefined;
  }

  /* If expecting condition statement and writing dot then expect alias.col */
  if (
    cb.ltoken?.type === "identifier.sql" &&
    cb.currToken?.text === "." &&
    (isCondition || allowedOperands.includes(cb.l1token?.textLC ?? ""))
  ) {
    return await suggestColumnByType(cb.l2token);
  }

  /** Must not match on alias select */
  if (cb.currToken?.text === "." || !cb.thisLinePrevTokens.length) {
    return undefined;
  }
  const jsonbPath = await jsonbPathSuggest(args);
  if (jsonbPath) {
    return jsonbPath;
  }
  const getPreviousIdentifier = () => {
    const reversedTokens = cb.prevTokens.slice(0).reverse();
    const idx = reversedTokens.findIndex(
      (t) => t.type === "identifier.sql" || t.type === "identifier.quote.sql",
    );
    const identifier = reversedTokens[idx];
    const colTokens = reversedTokens.slice(1, idx + 1);
    if (!identifier) return undefined;
    return {
      identifierText: identifier.text,
      colTokens: colTokens.slice(0).reverse(),
    };
  };

  /** Convenient autocomplete (column = 'value') */
  const suggestedValues = await suggestValue(
    args,
    prevKwdToken,
    getPreviousIdentifier,
  );
  if (suggestedValues) {
    return suggestedValues;
  }

  /** Is inside exists */
  if (
    prevKwdToken &&
    expectsCondition &&
    prevTokens.some(
      (t) =>
        t.textLC === "exists" &&
        t.type === "operator.sql" &&
        t.offset > prevKwdToken.offset,
    )
  ) {
    return undefined;
  }

  if (
    expectsCondition &&
    (prevKwdToken?.offset === ltoken?.offset ||
      ["and", "or"].includes(ltoken?.textLC as any) ||
      ltoken?.type === "operator.sql")
  ) {
    return await suggestColumnByType();
  }

  const getOperators = () => {
    const AndOr = ss.filter(
      (s) =>
        s.type === "keyword" &&
        ltoken?.type !== "keyword.sql" &&
        ["AND", "OR"].includes(s.name),
    );
    const ops = ss
      .filter((s) => s.type === "operator")
      .concat(
        ["IS NULL", "IS NOT NULL"].map((name) => ({
          name,
          type: "operator",
          label: { label: name },
          insertText: name,
          kind: getKind("operator"),
          range: undefined as any,
        })),
      );
    return { ops, AndOr };
  };

  if (thisLineLC && expectsCondition && ltoken?.text === ")") {
    const { AndOr, ops } = getOperators();
    return {
      suggestions: ops.concat(AndOr),
    };
  }

  /** First thing after condition keyword must ne column names  */
  if (cb.prevTokens.some((t) => t.textLC === "policy")) {
    if (
      (cb.currNestingFunc?.textLC === "using" ||
        cb.currNestingFunc?.textLC === "check") &&
      cb.prevText.trim().endsWith("(")
    ) {
      return await suggestColumnLike({ cb, ss, parentCb, setS, sql });
    }
  }

  if (
    thisLineLC &&
    expectsCondition &&
    ((getPreviousIdentifier() && cb.ltoken?.type !== "operator.sql") ||
      l1token?.type === "operator.sql")
  ) {
    const { identifierText: maybeColumn } = getPreviousIdentifier() ?? {};
    let prevCol = await getPrevCol(maybeColumn);

    const { AndOr, ops } = getOperators();
    if (cb.currToken && ops.some((s) => s.name === cb.currToken?.text)) {
      return {
        suggestions: [],
      };
    }
    const isNotJSONBSelector = !l1token?.text.includes(">");
    if (
      isNotJSONBSelector &&
      l1token?.type === "operator.sql" &&
      !["and", "or"].includes(l1token.textLC) &&
      prevText.endsWith(" ")
    ) {
      return {
        suggestions: AndOr,
      };
    }

    if (!isNotJSONBSelector && !prevCol) {
      prevCol = await getPrevCol(l2token?.text);
    }
    if (prevCol?.colInfo) {
      const { colInfo } = prevCol;
      const leftColOperators = ops
        .filter((o) => {
          const leftTypes = o.operatorInfo?.left_arg_types;
          return (
            !o.operatorInfo || // No info means matches all
            leftTypes?.some(
              (t) =>
                colInfo.data_type.toLowerCase().startsWith(t.toLowerCase()) ||
                colInfo.udt_name.endsWith(t),
            )
          );
        })
        .concat(ltoken?.type === "identifier.sql" ? [] : AndOr)
        .concat(ss.filter((s) => ["IN", "NOT"].includes(s.name.toUpperCase())))
        .map((o) => ({ ...o }));
      const usedOperators: Record<string, 1> = {};
      return {
        suggestions: leftColOperators.filter((o) => {
          if (!usedOperators[o.name]) {
            usedOperators[o.name] = 1;
            return true;
          }

          return false;
        }),
      };
    }
    return {
      suggestions: ops.concat(AndOr),
    };
  }
};
