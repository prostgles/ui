import type { MinimalSnippet } from "../CommonMatchImports";
import { PG_OBJECTS, suggestSnippets } from "../CommonMatchImports";
import { cleanExpect, getExpected } from "../getExpected";
import { getParentFunction } from "../MatchSelect";
import { getKind, type SQLMatcher } from "../registerSuggestions";
import { suggestColumnLike } from "../suggestColumnLike";
import { getNewColumnDefinitions, PG_COLUMN_CONSTRAINTS } from "../TableKWDs";
import { withKWDs } from "../withKWDs";
import { matchAlterPolicy } from "./matchAlterPolicy";
import { matchAlterTable } from "./matchAlterTable";
import { matchCreateOrAlterUser } from "./matchCreateOrAlterUser";

export const MatchAlter: SQLMatcher = {
  match: (cb) => cb.ftoken?.textLC === "alter",
  result: async (args) => {
    const { cb, ss, setS, sql } = args;
    const { prevLC, prevTokens, ltoken } = cb;
    const lltoken = prevTokens.at(-2);
    const rawExpect =
      prevTokens[prevTokens.findIndex((t) => t.textLC === "alter") + 1]
        ?.textLC ?? "";
    const expect = cleanExpect(rawExpect) ?? [];

    if (cb.prevLC.endsWith("if exists")) {
      return getExpected(expect, cb, ss);
    }

    const lastToken = cb.tokens.at(-1);
    const identifiers = cb.tokens
      .filter((t) => t.type === "identifier.sql")
      .map((t) => t.text);

    if (prevLC.includes("add constraint") && prevLC.includes("(")) {
      return getExpected("column", cb, ss);
    }

    if (
      ((lltoken?.textLC === "alter" || lltoken?.textLC === "drop") &&
        ltoken?.textLC === "constraint") ||
      cb.prevLC.includes(" constraint ")
    ) {
      return {
        suggestions: ss.filter((s) => {
          const { escaped_table_name } = s.constraintInfo ?? {};
          return (
            (escaped_table_name && identifiers.includes(escaped_table_name)) ||
            identifiers.includes([s.schema, escaped_table_name].join("."))
          );
        }),
      };
    }

    if (prevLC.endsWith("rename to")) {
      return suggestSnippets([
        {
          label: "$new_name",
        },
      ]);
    }

    if (cb.prevLC.startsWith("alter policy")) {
      return matchAlterPolicy(args);
    }

    const addColColumnTokenIdx = cb.prevTokens.findIndex(
      (t, i, arr) => t.textLC === "column" && arr[i - 1]?.textLC === "add",
    );
    if (addColColumnTokenIdx > -1 && !cb.thisLineLC.includes("references")) {
      const tokensAfter = cb.prevTokens.slice(addColColumnTokenIdx + 1);
      if (!tokensAfter.length) {
        return suggestSnippets(
          getNewColumnDefinitions(ss)
            .concat([{ label: "$new_column_name" }])
            .map((v) => ({ ...v, kind: getKind("column") })),
        );
      }
      if (tokensAfter.length === 1) {
        return getExpected("dataType", cb, ss);
      }

      const insideFun = getParentFunction(cb);
      if (insideFun?.func.textLC === "as") {
        if (
          insideFun.prevTokens
            ?.slice(-3)
            .map((t) => t.textLC)
            .join(" ") === "generated always as"
        ) {
          return suggestColumnLike({ cb, ss, setS, sql });
        }
      }

      return withKWDs(PG_COLUMN_CONSTRAINTS, {
        cb,
        ss,
        setS,
        sql,
      }).getSuggestion();
    }

    if (prevLC.endsWith("set storage")) {
      return suggestSnippets(
        ["PLAIN", "EXTERNAL", "EXTENDED", "MAIN"].map((label) => ({ label })),
      );
    }

    if (prevTokens.some((t) => ["reset", "set"].includes(t.textLC))) {
      if (["reset", "set"].includes(cb.ltoken?.textLC ?? "")) {
        return {
          suggestions: setS.map((s) => ({
            ...s,
            insertText: `${s.insertText} TO ${s.settingInfo?.enumvals?.length ? `\${1|${s.settingInfo.enumvals.join(",")}|}` : "$1"}`,
            insertTextRules: 4,
          })),
        };
      }

      if (cb.l2token?.textLC === "set") {
        const setting = setS.find((s) => s.name === cb.l1token?.text);
        if (setting) {
          if (setting.settingInfo?.enumvals) {
            return suggestSnippets(
              setting.settingInfo.enumvals.map((label) => ({ label })),
            );
          }

          return suggestSnippets([
            { label: "$value", docs: setting.settingInfo?.description },
          ]);
        }
      }
    }

    const userFields = ["role", "user"];
    const secondToken = cb.tokens[1];
    if (secondToken && userFields.includes(secondToken.textLC)) {
      return matchCreateOrAlterUser({ cb, ss, setS, sql });
    }

    if (prevLC.startsWith("alter database")) {
      if (prevLC.endsWith("alter database")) {
        return suggestSnippets(
          ss
            .filter((s) => s.type === "database")
            .flatMap((s) =>
              ALTED_DB_ACTIONS.map((a) => ({
                label: `${s.escapedIdentifier} ${a}`,
                kind: getKind("keyword"),
              })),
            ),
        );
      }
      return suggestSnippets(
        ALTED_DB_ACTIONS.map((label) => ({ label, kind: getKind("keyword") })),
      );
    } else if (prevLC.endsWith("data type")) {
      return {
        suggestions: ss.filter((s) => s.type === "dataType"),
      };
    } else if (prevLC.endsWith("owner to")) {
      const users = ss.filter((s) => userFields.includes(s.type));
      return suggestSnippets(users.map((s) => ({ label: s.name })));
    } else if (prevLC.startsWith("alter table")) {
      return matchAlterTable({ cb, ss, setS, sql });
    } else if (prevLC.startsWith("alter system")) {
      if (prevLC.includes("set") && ltoken?.textLC !== "set") {
        if (!prevTokens.some((t) => t.textLC === "to"))
          return suggestSnippets(["TO"].map((label) => ({ label })));
        return suggestSnippets(["DEFAULT"].map((label) => ({ label })));
      }
      return suggestSnippets(
        ["SET", "RESET", "RESET ALL"].map((label) => ({ label })),
      );
    }

    if (prevLC.endsWith("alter")) {
      return suggestSnippets(
        PG_OBJECTS.flatMap((label) =>
          [" IF EXISTS", ""].map<MinimalSnippet>((ifEx) => ({
            label: `${label}${ifEx}`,
            kind: getKind(label.toLowerCase() as any),
          })),
        ),
      );
    } else if (
      cb.tokens.length === 2 ||
      (cb.textLC.endsWith("exists") &&
        cb.tokens.at(-1)?.type === "operator.sql")
    ) {
      if (PG_OBJECTS.some((obj) => expect.includes(obj.toLowerCase() as any))) {
        const res = {
          suggestions: getExpected(expect, cb, ss).suggestions.map((s) => ({
            ...s,
            insertText: s.insertText || s.label,
            ...(s.type === "function" &&
              s.args && {
                label: `${s.escapedIdentifier}(${s.args.map((a) => a.data_type).join(", ")})`,
                // insertText: `${s.escapedIdentifier}(${s.args.map(a => a.data_type).join(", ")})`
              }),
          })) as any,
        };

        return res;
      }
    } else if (
      cb.prevText.endsWith(" ") &&
      (lastToken?.type === "identifier.sql" ||
        lastToken?.type === "delimiter.parenthesis.sql" ||
        lastToken?.type === "identifier.quote.sql")
    ) {
      if (cb.prevText.includes("(") && cb.prevLC.includes("constraint")) {
        const cols = ss.filter(
          (s) => s.type === "column" && identifiers.includes(s.parentName!),
        );
        return {
          suggestions:
            cols.length ? cols : (
              ss.filter((s) => s.type === "column" || s.type === "operator")
            ),
        };
      }

      // const obj = ss.find(s => s.name.includes(lastToken.text));
      const r = suggestSnippets([]);

      if (expect.includes("function") || expect.includes("table")) {
        r.suggestions = r.suggestions.concat(
          suggestSnippets(
            [
              `RENAME TO $new_${expect}_name`,
              "OWNER TO ",
              `SET SCHEMA $1`,
              `SET search_path = $1`,
              `DEPENDS ON EXTENSION `,
            ].map((label) => ({ label, kind: getKind("keyword") })),
          ).suggestions,
        );
      }

      return r;
    }

    return getExpected(expect, cb, ss);
  },
};

const ALTED_DB_ACTIONS = [
  "RENAME TO $new_name",
  "OWNER TO ",
  "SET TABLESPACE new_tablespace",
  "REFRESH COLLATION VERSION",
  "SET",
  "RESET configuration_parameter",
  "RESET ALL",
];
