import type { MinimalSnippet } from "../CommonMatchImports";
import { PG_OBJECTS, suggestSnippets } from "../CommonMatchImports";
import { cleanExpect, getExpected } from "../getExpected";
import { getParentFunction } from "../MatchSelect";
import {
  getKind,
  type ParsedSQLSuggestion,
  type SQLMatcher,
} from "../registerSuggestions";
import { suggestColumnLike } from "../suggestColumnLike";
import { getNewColumnDefinitions, PG_COLUMN_CONSTRAINTS } from "../TableKWDs";
import { withKWDs } from "../withKWDs";
import { matchAlterPolicy } from "./matchAlterPolicy";
import { matchAlterTable } from "./matchAlterTable";

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
    if (userFields.some((v) => cb.tokens[1]?.textLC === v)) {
      if (cb.tokens.length === 2) {
        return getExpected("user", cb, ss);
      } else if (userFields.some((v) => prevLC.includes("alter " + v))) {
        return getUserOpts(prevLC, ss, getKind("keyword"));
      }
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

/**
 * https://www.postgresql.org/docs/current/sql-createrole.html
 * 
 
const paramNode = Array.from(document.querySelectorAll('h2')).find(el => el.textContent === 'Parameters')?.parentElement;
Array.from(paramNode.querySelectorAll("dt")).map(d => ({ params: d.innerText.split("\n"), docs: d.nextElementSibling.innerText }));

 */

const ROLE_OPTIONS = [
  {
    params: ["name"],
    docs: "The name of the new role.",
  },
  {
    params: ["SUPERUSER", "NOSUPERUSER"],
    docs: "These clauses determine whether the new role is a “superuser”, who can override all access restrictions within the database. Superuser status is dangerous and should be used only when really needed. You must yourself be a superuser to create a new superuser. If not specified, NOSUPERUSER is the default.",
  },
  {
    params: ["LOGIN", "NOLOGIN"],
    docs: "These clauses determine whether a role is allowed to log in; that is, whether the role can be given as the initial session authorization name during client connection. A role having the LOGIN attribute can be thought of as a user. Roles without this attribute are useful for managing database privileges, but are not users in the usual sense of the word. If not specified, NOLOGIN is the default, except when CREATE ROLE is invoked through its alternative spelling CREATE USER.",
  },
  {
    params: ["ENCRYPTED PASSWORD 'password'"],
    docs: "Sets the role's password. (A password is only of use for roles having the LOGIN attribute, but you can nonetheless define one for roles without it.) If you do not plan to use password authentication you can omit this option. If no password is specified, the password will be set to null and password authentication will always fail for that user. A null password can optionally be written explicitly as PASSWORD NULL.\n\nNote\n\nSpecifying an empty string will also set the password to null, but that was not the case before PostgreSQL version 10. In earlier versions, an empty string could be used, or not, depending on the authentication method and the exact version, and libpq would refuse to use it in any case. To avoid the ambiguity, specifying an empty string should be avoided.\n\nThe password is always stored encrypted in the system catalogs. The ENCRYPTED keyword has no effect, but is accepted for backwards compatibility. The method of encryption is determined by the configuration parameter password_encryption. If the presented password string is already in MD5-encrypted or SCRAM-encrypted format, then it is stored as-is regardless of password_encryption (since the system cannot decrypt the specified encrypted password string, to encrypt it in a different format). This allows reloading of encrypted passwords during dump/restore.",
  },
  {
    params: ["CREATEDB", "NOCREATEDB"],
    docs: "These clauses define a role's ability to create databases. If CREATEDB is specified, the role being defined will be allowed to create new databases. Specifying NOCREATEDB will deny a role the ability to create databases. If not specified, NOCREATEDB is the default.",
  },
  {
    params: ["CREATEROLE", "NOCREATEROLE"],
    docs: "These clauses determine whether a role will be permitted to create new roles (that is, execute CREATE ROLE). A role with CREATEROLE privilege can also alter and drop other roles. If not specified, NOCREATEROLE is the default.",
  },
  {
    params: ["INHERIT", "NOINHERIT"],
    docs: "These clauses determine whether a role “inherits” the privileges of roles it is a member of. A role with the INHERIT attribute can automatically use whatever database privileges have been granted to all roles it is directly or indirectly a member of. Without INHERIT, membership in another role only grants the ability to SET ROLE to that other role; the privileges of the other role are only available after having done so. If not specified, INHERIT is the default.",
  },
  {
    params: ["REPLICATION", "NOREPLICATION"],
    docs: "These clauses determine whether a role is a replication role. A role must have this attribute (or be a superuser) in order to be able to connect to the server in replication mode (physical or logical replication) and in order to be able to create or drop replication slots. A role having the REPLICATION attribute is a very highly privileged role, and should only be used on roles actually used for replication. If not specified, NOREPLICATION is the default. You must be a superuser to create a new role having the REPLICATION attribute.",
  },
  {
    params: ["BYPASSRLS", "NOBYPASSRLS"],
    docs: "These clauses determine whether a role bypasses every row-level security (RLS) policy. NOBYPASSRLS is the default. You must be a superuser to create a new role having the BYPASSRLS attribute.\n\nNote that pg_dump will set row_security to OFF by default, to ensure all contents of a table are dumped out. If the user running pg_dump does not have appropriate permissions, an error will be returned. However, superusers and the owner of the table being dumped always bypass RLS.",
  },
  {
    params: ["CONNECTION LIMIT $connlimit"],
    docs: "If role can log in, this specifies how many concurrent connections the role can make. -1 (the default) means no limit. Note that only normal connections are counted towards this limit. Neither prepared transactions nor background worker connections are counted towards this limit.",
  },
  {
    params: ["VALID UNTIL 'timestamp'"],
    docs: "The VALID UNTIL clause sets a date and time after which the role's password is no longer valid. If this clause is omitted the password will be valid for all time.",
  },
  {
    params: ["IN ROLE"],
    docs: "The IN ROLE clause lists one or more existing roles to which the new role will be immediately added as a new member. (Note that there is no option to add the new role as an administrator; use a separate GRANT command to do that.)",
  },
  {
    params: ["IN GROUP"],
    docs: "IN GROUP is an obsolete spelling of IN ROLE.",
  },
  {
    params: ["ROLE"],
    docs: "The ROLE clause lists one or more existing roles which are automatically added as members of the new role. (This in effect makes the new role a “group”.)",
  },
  {
    params: ["ADMIN"],
    docs: "The ADMIN clause is like ROLE, but the named roles are added to the new role WITH ADMIN OPTION, giving them the right to grant membership in this role to others.",
  },
  {
    params: ["USER"],
    docs: "The USER clause is an obsolete spelling of the ROLE clause.",
  },
  {
    params: ["SYSID uid"],
    docs: "The SYSID clause is ignored, but is accepted for backwards compatibility.",
  },
] as const;

const USER_OPTIONS = [
  ...ROLE_OPTIONS.filter((r) =>
    r.params.some(
      (p: (typeof ROLE_OPTIONS)[number]["params"][number]) =>
        p === "CREATEDB" ||
        p === "VALID UNTIL 'timestamp'" ||
        p === "SYSID uid" ||
        p === "ENCRYPTED PASSWORD 'password'" ||
        p === "IN GROUP",
    ),
  ),
  {
    params: ["CREATEUSER", "NOCREATEUSER"],
    docs: "These clauses determine whether a user will be permitted to create new users himself. CREATEUSER will also make the user a superuser, who can override all access restrictions. If not specified, NOCREATEUSER is the default.",
  },
] as const;

export const getUserOpts = (
  prevLC: string,
  ss: ParsedSQLSuggestion[],
  kind: number,
) => {
  const prevWords = prevLC.split(" ");

  if (
    prevLC.endsWith("role") ||
    prevLC.endsWith("admin") ||
    prevLC.endsWith("group")
  ) {
    return {
      suggestions: ss.filter((s) => s.type === "role"),
    };
  }

  // const nonUsedOptions = ((prevLC.includes("create user") || prevLC.includes("alter user"))? USER_OPTIONS : ROLE_OPTIONS)
  const nonUsedOptions = ROLE_OPTIONS.filter(
    (o) =>
      !prevWords.some((w) =>
        (o.params as readonly string[]).includes(w.toUpperCase()),
      ),
  );
  const labels = nonUsedOptions
    .flatMap((o) =>
      o.params.map((p) => ({
        label: prevWords.includes("with") ? `${p} ` : `WITH ${p} `,
        docs: o.docs,
      })),
    )
    .concat([{ label: "SET", docs: "Set user setting" as any }]);

  return suggestSnippets(
    labels.map((l, i) => ({
      ...l,
      kind,
      sortText: i.toString().padStart(2, "0"),
    })),
  );
};
