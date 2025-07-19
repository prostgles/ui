import { isDefined } from "../../../utils";
import type { ColInfo } from "../../W_Table/TableMenu/getChartCols";
import { suggestSnippets } from "./CommonMatchImports";
import { getTableExpressionSuggestions } from "./completionUtils/getTableExpressionReturnTypes";
import type { TokenInfo } from "./completionUtils/getTokens";
import {
  KNDS as KindMap,
  type SQLMatchContext,
  type SQLMatcherResultArgs,
  type SQLMatcherResultType,
} from "./monacoSQLSetup/registerSuggestions";

/**
 * Convenient autocomplete (column = 'value')
 * */
export const suggestValue = async (
  args: SQLMatchContext & Pick<SQLMatcherResultArgs, "parentCb">,
  prevKwdToken: TokenInfo | undefined,
  getPreviousIdentifier: () =>
    | {
        identifierText: string;
        colTokens: TokenInfo[];
      }
    | undefined,
): Promise<SQLMatcherResultType | undefined> => {
  const { cb, ss, sql, parentCb } = args;

  /** Convenient autocomplete (column = 'value') */
  if (
    prevKwdToken?.textLC === "where" &&
    (allowedOperands.includes(cb.ltoken?.textLC ?? "") ||
      cb.currNestingFunc?.textLC === "in") &&
    getPreviousIdentifier() &&
    ["select", "with", "delete", "update"].includes(cb.ftoken?.textLC ?? "") &&
    cb.currToken?.type === "string.sql"
  ) {
    const { identifierText: columnName, colTokens } = getPreviousIdentifier()!;
    const currentText = `${cb.currToken.text.slice(1, -1)}`;
    const currentFilter = `%${cb.currToken.text.slice(1, -1)}%`;
    const [matchingTable, ...other] = ss.filter(
      (s) =>
        (s.type === "table" || s.type === "view") &&
        cb.tokens.some(
          (t) =>
            s.escapedIdentifier === t.text ||
            (s.schema === "pg_catalog" && s.escapedName === t.text),
        ) &&
        s.cols?.some((c) => c.escaped_identifier === columnName),
    );
    const getQueries = (udt_name: ColInfo["udt_name"]) => {
      let expression = columnName;
      if (
        ["jsonb", "json"].includes(udt_name) &&
        colTokens.some((t) => t.text.includes("->")) &&
        colTokens.at(-1)?.type === "string.sql"
      ) {
        expression = `(${colTokens.map((t) => t.text).join("")})`;
      }
      const querySelect = `DISTINCT LEFT(${expression}::TEXT, 500) as str, position(lower(\${currentText}) in lower(${expression}::TEXT)) as pos`;
      const queryFilter = ` WHERE LEFT(${expression}::TEXT, 500) ilike \${currentFilter} ORDER BY 2,1 LIMIT 20`;
      return {
        querySelect,
        queryFilter,
      };
    };
    let query = "";
    if (!matchingTable) {
      const { columnsWithAliasInfo } = await getTableExpressionSuggestions(
        { parentCb, cb, ss, sql },
        "columns",
      );
      const col =
        columnsWithAliasInfo.find(({ s }) => s.insertText === columnName) ||
        /** ensure "name" works */
        columnsWithAliasInfo.find(
          ({ s }) => JSON.stringify(s.insertText) === columnName,
        );
      if (col) {
        const { queryFilter, querySelect } = getQueries(
          col.s.colInfo?.udt_name as any,
        );
        query = col.getQuery(querySelect) + queryFilter;
      }
    } else if (!other.length) {
      const { queryFilter, querySelect } = getQueries(
        matchingTable.cols!.find((c) => c.escaped_identifier === columnName)!
          .udt_name as any,
      );
      query = `SELECT ${querySelect} FROM ${matchingTable.escapedIdentifier} ${queryFilter}`;
    }
    if (query) {
      const result = await args.sql?.(
        query,
        { currentFilter, currentText },
        { returnType: "default-with-rollback" },
      );
      const values = result?.rows
        .map((r: any) => r.str?.toString())
        .filter(isDefined);
      if (values?.length) {
        return suggestSnippets(
          values.map((v) => ({
            label: v,
            type: "value",
            kind: KindMap.Constant,
          })),
        );
      }
    }
  }
};

export const allowedOperands = [
  "=",
  ">",
  "<",
  ">=",
  "<=",
  "<>",
  "!=",
  "like",
  "ilike",
  "~~",
  "!~~",
];
