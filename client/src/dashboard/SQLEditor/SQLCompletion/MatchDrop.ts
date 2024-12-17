import { isDefined } from "prostgles-types";
import { SUGGESTION_TYPE_DOCS } from "../SQLEditor";
import type { MinimalSnippet } from "./CommonMatchImports";
import { PG_OBJECTS, suggestSnippets } from "./CommonMatchImports";
import { cleanExpectFull } from "./getExpected";
import type { SQLMatcher } from "./registerSuggestions";
import { getKind } from "./registerSuggestions";
import type { KWD } from "./withKWDs";
import { withKWDs } from "./withKWDs";

export const MatchDrop: SQLMatcher = {
  match: (cb) => cb.prevLC.startsWith("drop"),
  result: async ({ cb, ss, setS, sql }) => {
    const { prevLC, ltoken, l1token } = cb;

    const expect = cb.tokens[1]?.textLC;
    const afterExpect = cb.tokens[2]?.textLC;

    if (ltoken?.textLC === "owned") {
      return suggestSnippets([{ label: "BY" }]);
    }

    if (
      l1token?.textLC === "database" ||
      (cb.prevTokens[1]?.textLC === "database" && l1token?.textLC === "exists")
    ) {
      return suggestSnippets([
        {
          label: "WITH (FORCE)",
          kind: getKind("keyword"),
          docs: `Attempt to terminate all existing connections to the target database. It doesn't terminate if prepared transactions, active logical replication slots or subscriptions are present in the target database.\n\nThis will fail if the current user has no permissions to terminate other connections. Required permissions are the same as with pg_terminate_backend, described in Section 9.27.2. This will also fail if we are not able to terminate connections.`,
        },
      ]);
    }

    if (prevLC === "drop") {
      const r = suggestSnippets(
        PG_OBJECTS.flatMap<MinimalSnippet>((label) =>
          [" IF EXISTS", ""].map((ifEx) => {
            const labelUpper = label.toUpperCase();
            return {
              label: `${label}${ifEx}`,
              docs: SUGGESTION_TYPE_DOCS[labelUpper],
              kind: getKind((label.toLowerCase() as any) ?? "keyword"),
            };
          }),
        ),
      );
      return {
        suggestions: r.suggestions.concat(
          suggestSnippets([
            {
              label: "OWNED BY",
              insertText: "OWNED BY",
              docs: "DROP OWNED drops all the objects within the current database that are owned by one of the specified roles. Any privileges granted to the given roles on objects in the current database or on shared objects (databases, tablespaces, configuration parameters) will also be revoked.",
            },
          ]).suggestions,
        ),
      };
    } else if (expect) {
      const kwds = getKWDS(expect, afterExpect);
      if (kwds) {
        const result = {
          suggestions: (
            await withKWDs(kwds as any, { cb, ss, setS, sql }).getSuggestion()
          ).suggestions
            .filter((s) => s.type !== "extension" || s.extensionInfo?.installed)
            .map((s) => ({
              ...s,
              sortText:
                s.insertText.trim() === "IF EXISTS" ? "Zzz" : s.sortText,
              insertText:
                s.funcInfo && s.funcInfo.args.length ?
                  `${s.insertText}(${s.funcInfo.args.map((a) => a.data_type).join(", ")})`
                : s.type === "policy" ?
                  `${s.policyInfo?.escaped_identifier} ON ${s.policyInfo?.tablename_escaped}`
                : s.type === "trigger" ?
                  `${s.insertText} ON ${s.triggerInfo?.event_object_table}`
                : s.ruleInfo ?
                  `${s.insertText} ON ${s.ruleInfo.tablename_escaped}`
                  // s.type === "database"? `${s.insertText}\n\n${getDBInsertText(s.name)}` :
                : s.insertText,
            })),
        };
        return result;
      }

      // const expected = getExpected(expect, cb, ss).suggestions;

      // const getDBInsertText = (v: string) => "/* --If cannot drop due to it being in use then run this query from a different database on same server to close all connections \n" +
      // "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity \n" +
      // "WHERE pg_stat_activity.datname = '" + v + "' AND pid <> pg_backend_pid();\n"+
      // "DROP DATABASE " + v + ";\n \*/"
    }

    return {
      suggestions: [],
    };
  },
};

const getKWDS = (rawExpect: string, afterExpect?: string | undefined) => {
  if (rawExpect.toLowerCase() === "owned") {
    const kwd = "OWNED BY";
    return [
      {
        kwd,
        expects: "role",
        excludeIf: [rawExpect.toUpperCase()], // exclude a case where rawExpect=ROLE and cleanExpect=[USER] creates a bug that allows DROP ROLE USER ...
        docs: `
DROP OWNED is often used to prepare for the removal of one or more roles. Because DROP OWNED only affects the objects in the current database, it is usually necessary to execute this command in each database that contains objects owned by a role that is to be removed.

Using the CASCADE option might make the command recurse to objects owned by other users.

The REASSIGN OWNED command is an alternative that reassigns the ownership of all the database objects owned by one or more roles. However, REASSIGN OWNED does not deal with privileges for other objects.
        `,
      },
      {
        kwd: "CASCADE",
        dependsOn: kwd,
        docs: `Automatically drop objects that depend on the affected objects, and in turn all objects that depend on those objects. \nThe default is to refuse to drop the role if any objects depend on it`,
      },
    ] as const satisfies readonly KWD[];
  }

  const cl = cleanExpectFull(rawExpect, afterExpect);
  const expect = cl?.expect[0];
  if (!expect) return undefined;

  const objLabel = expect === "mview" ? "materialized view" : rawExpect;
  const kwd = (cl.kwd ?? objLabel).toUpperCase();
  const kwds: (KWD | undefined)[] = [
    {
      kwd,
      expects: expect,
      excludeIf: [rawExpect.toUpperCase()], // exclude a case where rawExpect=ROLE and cleanExpect=[USER] creates a bug that allows DROP ROLE USER ...
      options: [
        {
          label: "IF EXISTS",
          kind: getKind("keyword"),
          insertText: "IF EXISTS ",
          docs: `Do not throw an error if the ${objLabel} does not exist. A notice is issued in this case.`,
        },
      ],
    },
    expect === "table" ?
      { kwd: ",", expects: expect, canRepeat: true }
    : undefined,
    { kwd: "IF EXISTS", expects: expect, exactlyAfter: [kwd] },
    expect === "policy" ?
      ({ kwd: "ON", expects: "table", dependsOn: kwd } as const)
    : undefined,
    {
      kwd: "CASCADE",
      dependsOn: kwd,
      docs: `Automatically drop objects that depend on the ${objLabel}, and in turn all objects that depend on those objects. \nThe default is to refuse to drop the ${objLabel} if any objects depend on it`,
    },
  ];

  return kwds.filter(isDefined);
};
