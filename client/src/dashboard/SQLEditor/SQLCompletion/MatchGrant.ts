import { getKeys } from "prostgles-types";
import {
  type MinimalSnippet,
  PG_OBJECTS,
  suggestSnippets,
} from "./CommonMatchImports";
import { getParentFunction } from "./MatchSelect";
import { getExpected } from "./getExpected";
import { getKind, type SQLMatcher } from "./registerSuggestions";
import type { KWD } from "./withKWDs";
import { withKWDs } from "./withKWDs";

export const MatchGrant: SQLMatcher = {
  match: (cb) => ["grant", "revoke"].includes(cb.ftoken?.textLC as string),
  result: async ({ cb, ss, setS, sql }) => {
    const isGrant = cb.ftoken?.textLC === "grant";

    if (cb.ltoken?.textLC === "parameter") {
      return { suggestions: setS };
    }

    if (
      cb.prevTokens.length === 2 &&
      cb.prevTokens[1]?.type !== "keyword.sql" &&
      cb.prevTokens[1]?.type !== "operator.sql"
    ) {
      return withKWDs(
        [
          {
            kwd: isGrant ? "GRANT" : "REVOKE",
            expects: "role",
          },
          {
            kwd: ",",
            excludeIf: ["TO", "FROM"],
          },
          {
            kwd: isGrant ? "TO" : "FROM",
            expects: "role",
          },
        ] satisfies KWD[],
        { cb, ss, setS, sql },
      ).getSuggestion();
    }

    const columnKwds = ["select", "update", "insert", "all"];
    const func = getParentFunction(cb);
    if (func?.func && columnKwds.includes(func.func.textLC)) {
      return getExpected("column", cb, ss);
    }
    if (
      !func?.func &&
      cb.ltoken?.textLC === "," &&
      !cb.textLC.includes(" all ")
    ) {
      const additional: MinimalSnippet[] = Object.entries(PRIVILEGES)
        .filter(([p, d]) => columnKwds.includes(p.toLowerCase()))
        .map(([label, { docs }]) => ({
          label,
          docs,
          kind: getKind("keyword"),
        }));
      return suggestSnippets(additional);
    }
    if (columnKwds.includes(cb.ltoken?.textLC as string)) {
      const { suggestions } = getExpected("(column)", cb, ss);
      return {
        suggestions: [
          ...suggestions.map((s) => ({
            ...s,
            insertText: `(${s.escapedIdentifier} ) ON ${s.escapedParentName}`,
          })),
          ...suggestSnippets([{ label: "ON" }]).suggestions.map((s) => ({
            ...s,
            sortText: "!",
          })),
        ],
      };
    }

    const allPrivilegeTypes = getKeys(PRIVILEGES);
    const addAll = (objects: readonly (typeof PG_OBJECTS)[number][]) => {
      const allEntities: (typeof PG_OBJECTS)[number][] = [
        "TABLE",
        "FUNCTION",
        "SEQUENCE",
      ];
      const matching = allEntities.filter((e) => objects.includes(e));
      if (matching.length) {
        return [...matching.map((obj) => `ALL ${obj}S IN SCHEMA`), ...objects];
      }

      return objects;
    };
    type ONOption = Extract<{ label: string }, MinimalSnippet>;
    const ON_options: ONOption[] = [
      { label: "ALL TABLES IN SCHEMA" },
      { label: "ALL FUNCTIONS IN SCHEMA" },
      { label: "ALL SEQUENCES IN SCHEMA" },
      ...PG_OBJECTS.map(
        (label) =>
          ({
            label,
            kind: getKind(
              (label as string).split(" ")[0]?.toLowerCase?.() as any,
            ),
          }) as ONOption,
      ).filter(({ label }) => label !== "VIEW"),
    ].filter((opt) => {
      const objMatch = Object.entries(PRIVILEGES).find(
        ([privilege, { objects }]) => {
          return (
            cb.prevLC.includes(` ${privilege.toLowerCase()} `) &&
            objects.some((objName) =>
              opt.label.toLowerCase().includes(objName.toLowerCase()),
            )
          );
        },
      );
      return objMatch;
    });

    if (
      cb.ltoken?.textLC === "on" &&
      cb.prevTokens.some((t) => columnKwds.includes(t.textLC))
    ) {
      const { suggestions } = getExpected("table", cb, ss);
      if (cb.l1token?.textLC === ")") {
        const tableSuggestions = suggestions.map((s) => {
          const matchingColumnNames = s.tablesInfo?.cols.filter((c) =>
            cb.prevTokens.some((t) => t.text === c.escaped_identifier),
          ).length;
          return {
            ...s,
            sortText:
              (s.schema === "public" ? "a" : "b") +
              (matchingColumnNames ? 100 - matchingColumnNames : "a"),
          };
        });
        return {
          suggestions: tableSuggestions,
        };
      }
      return {
        suggestions: [
          ...suggestions,
          ...suggestSnippets(ON_options).suggestions.map((s) => ({
            ...s,
            sortText: "!",
            kind: getKind("keyword"),
          })),
        ],
      };
    }
    if (
      cb.tokens.length <= 3 &&
      (cb.prevLC.endsWith("all") || cb.prevLC.endsWith("all privileges"))
    ) {
      return suggestSnippets(
        ON_options.map((p) => ({ label: `ON ${p.label}` })),
      );
    }

    const excludePriviledge: Pick<KWD, "excludeIf"> = {
      excludeIf: (cb) =>
        allPrivilegeTypes.some((v) => cb.prevLC.includes(v.toLowerCase())),
    };
    const kwds = [
      {
        kwd: isGrant ? "GRANT" : "REVOKE",
        expects: "role",
        options: Object.entries(PRIVILEGES).flatMap(([label, { docs }]) => {
          const item = {
            label: `${label} ON`,
            docs,
            kind: getKind("keyword"),
          };
          if (columnKwds.includes(label.toLowerCase())) {
            return [item, { ...item, label }];
          }
          return item;
        }),
      },
      {
        kwd: "EXECUTE",
        ...excludePriviledge,
        options: [{ label: "ON FUNCTION" }],
      },
      {
        kwd: "FUNCTION",
        ...excludePriviledge,
        expects: "function",
        dependsOn: "ON",
      },
      {
        kwd: "ON",
        exactlyAfter: allPrivilegeTypes,
        options: ON_options,
      },
      ...Object.entries(PRIVILEGES).map(
        ([kwd, { objects }]) =>
          ({
            kwd: `${kwd} ON`,
            ...excludePriviledge,
            expects:
              kwd.startsWith("ALL") ? undefined : (kwd.toLowerCase() as any),
            options: addAll(objects).map((label) => ({
              label,
              kind: getKind(
                (label as string).split(" ")[0]?.toLowerCase?.() as any,
              ),
            })),
          }) satisfies KWD,
      ),

      ...PG_OBJECTS.map((kwd) => ({
        kwd,
        exactlyAfter: ["ON"],
        expects:
          kwd === "TABLE" ? ["table", "view"] : (kwd.toLowerCase() as any),
      })),
      {
        kwd: "IN SCHEMA",
        include: (cb) =>
          !cb.prevLC.includes(` in schema `) && cb.prevLC.includes(` on all `),
        expects: "schema",
      },
      {
        kwd: isGrant ? "TO" : "FROM",
        expects: "role",
        docs: ``,
        include: (cb) =>
          cb.l1token?.textLC === "on" ||
          (cb.prevTokens.some((t) => t.textLC === "on") &&
            cb.ltoken?.textLC !== "on"),
      },
    ] satisfies KWD[];
    return withKWDs(kwds, { cb, ss, setS, sql }).getSuggestion();
  },
};

/** https://www.postgresql.org/docs/current/ddl-priv.html#PRIVILEGE-ABBREVS-TABLE */
const PRIVILEGES = {
  ALL: {
    docs: "Allows all privileges",
    objects: PG_OBJECTS.slice(0),
  },
  "ALL PRIVILEGES": {
    docs: "Allows all privileges",
    objects: PG_OBJECTS.slice(0),
  },
  SELECT: {
    docs: `Allows SELECT from any column, or specific column(s), of a table, view, materialized view, or other table-like object. Also allows use of COPY TO. This privilege is also needed to reference existing column values in UPDATE or DELETE. For sequences, this privilege also allows use of the currval function. For large objects, this privilege allows the object to be read.`,
    objects: ["LARGE OBJECT", "TABLE"],
  },
  INSERT: {
    docs: `Allows INSERT of a new row into a table, view, etc. Can be granted on specific column(s), in which case only those columns may be assigned to in the INSERT command (other columns will therefore receive default values). Also allows use of COPY FROM.`,
    objects: ["TABLE"],
  },
  UPDATE: {
    docs: `Allows UPDATE of any column, or specific column(s), of a table, view, etc. (In practice, any nontrivial UPDATE command will require SELECT privilege as well, since it must reference table columns to determine which rows to update, and/or to compute new values for columns.) SELECT ... FOR UPDATE and SELECT ... FOR SHARE also require this privilege on at least one column, in addition to the SELECT privilege. For sequences, this privilege allows use of the nextval and setval functions. For large objects, this privilege allows writing or truncating the object.`,
    objects: ["TABLE"],
  },
  DELETE: {
    docs: `Allows DELETE of a row from a table, view, etc. (In practice, any nontrivial DELETE command will require SELECT privilege as well, since it must reference table columns to determine which rows to delete.)`,
    objects: ["TABLE"],
  },
  TRUNCATE: {
    docs: `Allows TRUNCATE on a table.`,
    objects: ["TABLE"],
  },
  REFERENCES: {
    docs: `Allows creation of a foreign key constraint referencing a table, or specific column(s) of a table.`,
    objects: ["TABLE"],
  },
  TRIGGER: {
    docs: `Allows creation of a trigger on a table, view, etc.`,
    objects: ["TABLE"],
  },
  CREATE: {
    docs: `For databases, allows new schemas and publications to be created within the database, and allows trusted extensions to be installed within the database.
      For schemas, allows new objects to be created within the schema. To rename an existing object, you must own the object and have this privilege for the containing schema.
      For tablespaces, allows tables, indexes, and temporary files to be created within the tablespace, and allows databases to be created that have the tablespace as their default tablespace.
      Note that revoking this privilege will not alter the existence or location of existing objects.`,
    objects: ["DATABASE", "SCHEMA", "TABLESPACE"],
  },
  CONNECT: {
    docs: `Allows the grantee to connect to the database. This privilege is checked at connection startup (in addition to checking any restrictions imposed by pg_hba.conf).`,
    objects: ["DATABASE"],
  },
  TEMPORARY: {
    docs: `Allows temporary tables to be created while using the database.`,
    objects: ["DATABASE"],
  },
  EXECUTE: {
    docs: `Allows calling a function or procedure, including use of any operators that are implemented on top of the function. This is the only type of privilege that is applicable to functions and procedures.`,
    objects: ["FUNCTION", "PROCEDURE", "ROUTINE"],
  },
  USAGE: {
    docs: `For procedural languages, allows use of the language for the creation of functions in that language. This is the only type of privilege that is applicable to procedural languages.
    For schemas, allows access to objects contained in the schema (assuming that the objects' own privilege requirements are also met). Essentially this allows the grantee to “look up” objects within the schema. Without this permission, it is still possible to see the object names, e.g., by querying system catalogs. Also, after revoking this permission, existing sessions might have statements that have previously performed this lookup, so this is not a completely secure way to prevent object access.
    For sequences, allows use of the currval and nextval functions.
    For types and domains, allows use of the type or domain in the creation of tables, functions, and other schema objects. (Note that this privilege does not control all “usage” of the type, such as values of the type appearing in queries. It only prevents objects from being created that depend on the type. The main purpose of this privilege is controlling which users can create dependencies on a type, which could prevent the owner from changing the type later.)
    For foreign-data wrappers, allows creation of new servers using the foreign-data wrapper.
    For foreign servers, allows creation of foreign tables using the server. Grantees may also create, alter, or drop their own user mappings associated with that server.
    `,
    objects: [
      "DOMAIN",
      "FOREIGN DATA WRAPPER",
      "FOREIGN SERVER",
      "LANGUAGE",
      "SCHEMA",
      "SEQUENCE",
      "TYPE",
    ],
  },
  SET: {
    docs: `Allows a server configuration parameter to be set to a new value within the current session. (While this privilege can be granted on any parameter, it is meaningless except for parameters that would normally require superuser privilege to set.)`,
    objects: ["PARAMETER"],
  },
  "ALTER SYSTEM": {
    docs: `Allows a server configuration parameter to be configured to a new value using the ALTER SYSTEM command.`,
    objects: ["PARAMETER"],
  },
} as const satisfies Record<
  string,
  {
    docs: string;
    objects: readonly (typeof PG_OBJECTS)[number][];
  }
>;
