import { isDefined } from "../../../utils";
import { suggestSnippets } from "./CommonMatchImports";
import type { CodeBlock } from "./completionUtils/getCodeBlock";
import type { RawExpect } from "./getExpected";
import type { ParsedSQLSuggestion } from "./monacoSQLSetup/registerSuggestions";
import { getKind } from "./monacoSQLSetup/registerSuggestions";

type Args = {
  ss: ParsedSQLSuggestion[];
  rawExpect: RawExpect;
  cb: CodeBlock;
  tableSuggestions: ParsedSQLSuggestion[];
};

export const getJoinSuggestions = ({
  ss,
  tableSuggestions,
  rawExpect,
  cb,
}: Args) => {
  let joinSuggestions: ParsedSQLSuggestion[] = [];
  const identifiers = cb.prevIdentifiers;
  if (identifiers.length) {
    if (cb.ltoken?.textLC === "join" && rawExpect === "tableOrView") {
      const prevTableIndexes = cb.prevTokens
        .map((_, i) => {
          const prevToken = cb.prevTokens[i - 1];
          const isTable =
            prevToken && ["from", "join"].includes(prevToken.textLC);
          return isTable ? i : undefined;
        })
        .filter(isDefined);

      prevTableIndexes.forEach((tableTokenIdx) => {
        const joins = getTableJoins(tableTokenIdx, prevTableIndexes, {
          ss,
          tableSuggestions,
          rawExpect,
          cb,
        });
        joinSuggestions = [...joinSuggestions, ...joins];
      });
    }

    const matches = tableSuggestions.filter((s) =>
      identifiers.some((pi) => pi.text === s.escapedParentName),
    );
    if (matches.length) {
      return {
        suggestions: matches,
        joinSuggestions: undefined,
      };
    }
  }

  return {
    joinSuggestions,
    suggestions: undefined,
  };
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

const getTableJoins = (
  tableTokenIdx: number,
  prevTableTokenIndexes: number[],
  { ss, tableSuggestions, cb }: Args,
) => {
  const joinSuggestions: ParsedSQLSuggestion[] = [];
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

  // const joinConstraints = ss
  //   .map((s) =>
  //     (
  //       s.type === "constraint" &&
  //       s.constraintInfo?.contype === "f" &&
  //       prevTablesIncludingFromTable.some((pt) =>
  //         [s.constraintInfo!.ftable_oid, s.constraintInfo!.table_oid].includes(
  //           pt.tablesInfo.oid,
  //         ),
  //       )
  //     ) ?
  //       s.constraintInfo
  //     : undefined,
  //   )
  //   .filter(isDefined);

  // const joinOptions = prevTablesIncludingFromTable.map(
  //   ({ tablesInfo, alias }) => {
  //     const isInPrevTables = (t: string) =>
  //       prevTablesIncludingFromTable.some((pt) => pt.tableName === t);
  //     const fCons = joinConstraints
  //       .map(
  //         ({
  //           ftable_name,
  //           table_name,
  //           table_oid,
  //           ftable_oid,
  //           conkey,
  //           confkey,
  //         }) => {
  //           if (!isInPrevTables(ftable_name!) && tablesInfo.oid === table_oid) {
  //             return {
  //               ftable_name,
  //               conkey,
  //               confkey,
  //             };
  //           }
  //           if (!isInPrevTables(table_name!) && tablesInfo.oid === ftable_oid) {
  //             return {
  //               ftable_name: table_name,
  //               conkey: confkey,
  //               confkey: conkey,
  //             };
  //           }
  //         },
  //       )
  //       .filter(isDefined);
  //     const conditions = fCons.map(({ ftable_name, conkey, confkey }) => {
  //       const joinToTableAlias = getStartingLetters(ftable_name!);
  //       const on = conkey!
  //         .map((ordPos, cidx) => {
  //           const toColumnPosition = confkey![cidx];
  //           const fromTableCol = tablesInfo.cols.find(
  //             (c) => c.ordinal_position === ordPos,
  //           )?.escaped_identifier;
  //           if (!fromTableCol) return;
  //           const toTable = ss.find(
  //             (s) =>
  //               s.type === "table" &&
  //               s.escapedIdentifier?.includes(ftable_name!),
  //           );
  //           const toColumn = toTable?.cols?.find(
  //             (c) => c.ordinal_position === toColumnPosition,
  //           )?.escaped_identifier;
  //           if (!toColumn) return;
  //           return `${alias}.${fromTableCol} = ${joinToTableAlias}.${toColumn}`;
  //         })
  //         .join(" AND ");
  //       return `${ftable_name} ${joinToTableAlias}\nON ${on}`;
  //     });
  //     console.log(conditions);
  //   },
  // );
  const fromTableSuggestion = ss.find(
    (s) => s.type === "table" && s.escapedIdentifier?.includes(fromTable),
  );
  const fromTableAlias =
    cb.prevTokens[tableTokenIdx + 1]?.textLC !== "as" ?
      cb.prevTokens[tableTokenIdx + 1]
    : cb.prevTokens[tableTokenIdx + 2];
  const fromTableAliasStr =
    fromTableAlias?.type === "identifier.sql" ? fromTableAlias.text : fromTable;
  if (fromTableSuggestion) {
    tableSuggestions.forEach((tableSuggestion) => {
      const isTableAndNotInPrevTableNames =
        tableSuggestion.type === "table" &&
        tableSuggestion.name &&
        !prevTablesIncludingFromTable.some(
          (pt) => pt.tableName === tableSuggestion.name,
        );

      if (isTableAndNotInPrevTableNames) {
        const ftableAlias = getStartingLetters(tableSuggestion.name);
        tableSuggestion.cols?.forEach((c) => {
          let joins: ParsedSQLSuggestion[] = [];

          /** referenced */
          let indentSize = 2;
          if (cb.thisLineLC.includes("join")) {
            indentSize =
              cb.thisLine.split(" ").findIndex((char) => char !== " ") + 2;
          }
          const fcols = fromTableSuggestion.cols?.filter(
            (c) => c.cConstraint?.ftable_name === tableSuggestion.name,
          );
          if (c.cConstraint?.ftable_name === fromTable) {
            const onConditions = c.cConstraint.conkey!.map((ordPos, cidx) => {
              const fromOrdPos = c.cConstraint!.confkey![cidx];
              const fTableCol = `${ftableAlias}.${tableSuggestion.cols?.find((c) => c.ordinal_position === ordPos)?.escaped_identifier}`;
              const tableCol = `${fromTableAliasStr}.${fromTableSuggestion.cols?.find((c) => c.ordinal_position === fromOrdPos)?.escaped_identifier}`;
              return `${fTableCol} = ${tableCol}`;
            });
            const joinCondition = `${tableSuggestion.escapedIdentifier} ${ftableAlias}\n${" ".repeat(indentSize)}ON ${onConditions.join(" AND ")}`;
            joins = suggestSnippets([
              {
                label: joinCondition.replaceAll("\n", ""),
                insertText: joinCondition,
                sortText: "a",
                kind: getKind("table"),
                docs: tableSuggestion.documentation,
              },
            ]).suggestions;

            /** referencing */
          } else if (fcols?.length) {
            const onConditions = fcols.map((c) =>
              c
                .cConstraint!.confkey?.map((ordPos, cidx) => {
                  const fromTableOrdPos = c.cConstraint?.conkey![cidx];
                  const fTableCol = `${ftableAlias}.${tableSuggestion.cols?.find((c) => c.ordinal_position === ordPos)?.escaped_identifier}`;
                  const tableCol = `${fromTableAliasStr}.${fromTableSuggestion.cols?.find((c) => c.ordinal_position === fromTableOrdPos)?.escaped_identifier}`;
                  return `${fTableCol} = ${tableCol}`;
                })
                .join(" AND "),
            );

            const joinCondition = `${tableSuggestion.escapedIdentifier} ${ftableAlias}\n${" ".repeat(indentSize)}ON ${onConditions.join(" AND ")}`;
            joins = suggestSnippets([
              {
                label: joinCondition.replaceAll("\n", ""),
                insertText: joinCondition,
                sortText: "a",
                kind: getKind("table"),
                docs: tableSuggestion.documentation,
              },
            ]).suggestions;
          }
          joins.forEach((j) => {
            if (!joinSuggestions.some((js) => js.label === j.label)) {
              joinSuggestions.push(j);
            }
          });
        });
      }
    });
  }

  return joinSuggestions;
};
