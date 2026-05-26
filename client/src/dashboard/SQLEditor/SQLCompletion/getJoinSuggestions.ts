import { isDefined } from "../../../utils/utils";
import { suggestSnippets } from "./CommonMatchImports";
import type { CodeBlock } from "./completionUtils/getCodeBlock";
import type { RawExpect } from "./getExpected";
import type { ParsedSQLSuggestion } from "./monacoSQLSetup/registerSuggestions";
import { getKind } from "./monacoSQLSetup/registerSuggestions";

type Args = {
  ss: ParsedSQLSuggestion[];
  rawExpect: RawExpect;
  cb: CodeBlock;
};

export const getJoinSuggestions = ({ ss, rawExpect, cb }: Args) => {
  const { prevIdentifiers, ltoken, prevTokens } = cb;
  if (!prevIdentifiers.length) {
    return [];
  }
  if (ltoken?.textLC !== "join" || rawExpect !== "tableOrView") {
    return [];
  }
  const prevTableIndexes = prevTokens
    .map((_, i) => {
      const prevToken = prevTokens[i - 1];
      const isTable = prevToken && ["from", "join"].includes(prevToken.textLC);
      return isTable ? i : undefined;
    })
    .filter(isDefined);

  return getTableJoins(prevTableIndexes, {
    ss,
    rawExpect,
    cb,
  });
};

export const removeQuotes = (str: string) => {
  if (str.startsWith('"')) {
    str = str.slice(1);
  }
  if (str.endsWith('"')) {
    str = str.slice(0, -1);
  }
  return str;
};

export const getStartingLetters = (rawString) => {
  const inputString = removeQuotes(rawString);
  if (typeof inputString !== "string" || inputString.length === 0) {
    return "";
  }

  const words = inputString.split(/[_-]|(?=[A-Z])/);
  const startingLetters = words.map((word) => word.charAt(0));

  return startingLetters.join("");
};

const getTableJoins = (prevTableTokenIndexes: number[], { ss, cb }: Args) => {
  const tableTokenIdx = prevTableTokenIndexes[0]!;
  const fromTable = cb.prevTokens[tableTokenIdx]?.text;
  if (!fromTable) return [];

  const prevTablesIncludingFromTable = prevTableTokenIndexes
    .map((i) => {
      const tableName = cb.prevTokens[i]?.text;
      const tableAliasToken =
        cb.prevTokens[i + 1]?.textLC !== "as" ?
          cb.prevTokens[i + 1]
        : cb.prevTokens[i + 2];
      if (!tableName) {
        return;
      }
      const { tablesInfo } =
        ss.find(
          (t) =>
            t.type === "table" &&
            t.tablesInfo?.escaped_identifiers.includes(tableName),
        ) ?? {};
      const alias =
        tableAliasToken?.type === "identifier.sql" ?
          tableAliasToken.text
        : tableName;
      return tablesInfo && { tableName, tablesInfo, alias };
    })
    .filter(isDefined);

  const isInPrevTables = (oid: number) =>
    prevTablesIncludingFromTable.some((pt) => pt.tablesInfo.oid === oid);

  const joinConstraints = ss
    .map(({ type, constraintInfo }) => {
      if (type !== "constraint") return;
      if (!constraintInfo) return;
      const {
        contype,
        confkey,
        conkey,
        table_name,
        table_oid,
        ftable_name,
        ftable_oid,
      } = constraintInfo;
      if (!isDefined(contype) || contype !== "f") return;
      if (
        conkey === null ||
        confkey === null ||
        ftable_oid === null ||
        ftable_name === null
      )
        return;

      if (!isInPrevTables(ftable_oid) && isInPrevTables(table_oid)) {
        return {
          table_oid,
          ftable_name,
          ftable_oid,
          conkey,
          confkey,
        };
      }
      if (!isInPrevTables(table_oid) && isInPrevTables(ftable_oid)) {
        return {
          table_oid: ftable_oid,
          ftable_name: table_name,
          ftable_oid: table_oid,
          conkey: confkey,
          confkey: conkey,
        };
      }
    })
    .filter(isDefined);

  const currentIndentSize =
    cb.thisLineLC.trim() ?
      cb.thisLine.split(" ").findIndex((char) => char !== " ")
    : 0;
  const indentSize = currentIndentSize + 2;
  const joinOptions = prevTablesIncludingFromTable
    .map(({ tablesInfo, alias }) => {
      return joinConstraints
        .filter(({ table_oid }) => table_oid === tablesInfo.oid)
        .map(({ ftable_name, ftable_oid, conkey, confkey }) => {
          const ftable = ss.find(
            (t) => t.type === "table" && t.tablesInfo?.oid === ftable_oid,
          );
          if (!ftable) return;
          const joinToTableAlias = getStartingLetters(ftable_name);
          const condition = conkey
            .map((ordPos, cidx) => {
              const toColumnPosition = confkey[cidx];
              const fromTableCol = tablesInfo.cols.find(
                (c) => c.ordinal_position === ordPos,
              )?.escaped_identifier;
              if (!fromTableCol) return;
              const toTable = ss.find(
                (s) =>
                  s.type === "table" &&
                  s.escapedIdentifier?.includes(ftable_name),
              );
              const toColumn = toTable?.cols?.find(
                (c) => c.ordinal_position === toColumnPosition,
              )?.escaped_identifier;
              if (!toColumn) return;
              return [
                `${joinToTableAlias}.${toColumn}`,
                `${alias}.${fromTableCol}`,
              ].join(" = ");
            })
            .map(
              (condition, i) =>
                `${" ".repeat(indentSize)}${!i ? "ON" : "AND"} ${condition}`,
            )
            .join("\n");
          const joinQuery = `${ftable_name} ${joinToTableAlias}\n${condition}\n`;
          return { joinQuery, ftable };
        })
        .filter(isDefined);
    })
    .flat();

  const { suggestions } = suggestSnippets(
    joinOptions.map(({ joinQuery, ftable }) => ({
      label: joinQuery.replaceAll("\n", ""),
      insertText: joinQuery,
      sortText: "a",
      kind: getKind("table"),
      docs: ftable.documentation,
    })),
  );

  return suggestions;
};
