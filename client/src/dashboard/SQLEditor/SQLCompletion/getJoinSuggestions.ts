import { isDefined } from "../../../utils";
import { suggestSnippets } from "./CommonMatchImports";
import type { CodeBlock } from "./completionUtils/getCodeBlock";
import type { RawExpect } from "./getExpected";
import type { ParsedSQLSuggestion } from "./registerSuggestions";
import { getKind } from "./registerSuggestions";

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
  const prevTableNames = prevTableTokenIndexes
    .map((i) => cb.prevTokens[i]?.text)
    .filter(isDefined);
  if (!fromTable) return [];
  const fromTableS = ss.find(
    (s) => s.type === "table" && s.escapedIdentifier?.includes(fromTable),
  );
  const fromTableAlias =
    cb.prevTokens[tableTokenIdx + 1]?.textLC !== "as" ?
      cb.prevTokens[tableTokenIdx + 1]
    : cb.prevTokens[tableTokenIdx + 2];
  const fromTableAliasStr =
    fromTableAlias?.type === "identifier.sql" ? fromTableAlias.text : fromTable;
  if (fromTableS) {
    tableSuggestions.forEach((s) => {
      if (s.type === "table" && s.name && !prevTableNames.includes(s.name)) {
        const ftableAlias = getStartingLetters(s.name);
        s.cols?.forEach((c) => {
          let joins: ParsedSQLSuggestion[] = [];

          /** referenced */
          let indentSize = 2;
          if (cb.thisLineLC.includes("join")) {
            indentSize =
              cb.thisLine.split(" ").findIndex((char) => char !== " ") + 2;
          }
          const fcols = fromTableS.cols?.filter(
            (c) => c.cConstraint?.ftable_name === s.name,
          );
          if (c.cConstraint?.ftable_name === fromTable) {
            const onCondition = c.cConstraint.conkey!.map((ordPos, cidx) => {
              const fromOrdPos = c.cConstraint!.confkey![cidx];
              const fTableCol = `${ftableAlias}.${s.cols?.find((c) => c.ordinal_position === ordPos)?.escaped_identifier}`;
              const tableCol = `${fromTableAliasStr}.${fromTableS.cols?.find((c) => c.ordinal_position === fromOrdPos)?.escaped_identifier}`;
              return `${fTableCol} = ${tableCol}`;
            });
            const joinCondition = `${s.escapedIdentifier} ${ftableAlias}\n${" ".repeat(indentSize)}ON ${onCondition.join(" OR ")}`;
            joins = suggestSnippets([
              {
                label: joinCondition.replaceAll("\n", ""),
                insertText: joinCondition,
                sortText: "a",
                kind: getKind("table"),
                docs: s.documentation,
              },
            ]).suggestions;

            /** referencing */
          } else if (fcols?.length) {
            const onCondition = fcols.map((c) =>
              c
                .cConstraint!.confkey?.map((ordPos, cidx) => {
                  const fromTableOrdPos = c.cConstraint?.conkey![cidx];
                  const fTableCol = `${ftableAlias}.${s.cols?.find((c) => c.ordinal_position === ordPos)?.escaped_identifier}`;
                  const tableCol = `${fromTableAliasStr}.${fromTableS.cols?.find((c) => c.ordinal_position === fromTableOrdPos)?.escaped_identifier}`;
                  return `${fTableCol} = ${tableCol}`;
                })
                .join(" AND "),
            );

            const joinCondition = `${s.escapedIdentifier} ${ftableAlias}\n${" ".repeat(indentSize)}ON ${onCondition.join(" OR ")}`;
            joins = suggestSnippets([
              {
                label: joinCondition.replaceAll("\n", ""),
                insertText: joinCondition,
                sortText: "a",
                kind: getKind("table"),
                docs: s.documentation,
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
