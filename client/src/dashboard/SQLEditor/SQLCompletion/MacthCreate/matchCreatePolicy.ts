import { POLICY_FOR, suggestSnippets } from "../CommonMatchImports";
import { getExpected } from "../getExpected";
import { asSQL } from "../KEYWORDS";
import type { SQLMatchContext, SQLMatcher } from "../registerSuggestions";
import { type KWD, suggestKWD, withKWDs } from "../withKWDs";

export const matchCreatePolicy: SQLMatcher["result"] = async ({
  cb,
  ss,
  setS,
  sql,
}: SQLMatchContext) => {
  const _ss = ss.map((s) => ({
    ...s,
    ...(s.name === "FOR" ? { documentation: "" }
    : s.name === "USING" ?
      {
        documentation: {
          value: `Example:\n${asSQL("(username = CURRENT_USER)")} \n\nAny SQL conditional expression (returning boolean). The conditional expression cannot contain any aggregate or window functions. This expression will be added to queries that refer to the table if row-level security is enabled. Rows for which the expression returns true will be visible. Any rows for which the expression returns false or null will not be visible to the user (in a SELECT), and will not be available for modification (in an UPDATE or DELETE). Such rows are silently suppressed; no error is reported.`,
        },
      }
    : {}),
  }));

  const { getSuggestion } = withKWDs(KwdPolicy, { cb, ss: _ss, setS, sql });

  if (cb.thisLinePrevTokens[0]?.textLC === "to" && cb.ltoken?.textLC !== "to") {
    if (cb.ltoken?.textLC === ",") {
      return getExpected("role", cb, ss);
    }
    return suggestSnippets([
      {
        label: ",",
        docs: `The role(s) to which the policy is to be applied. The default is PUBLIC, which will apply the policy to all roles.`,
      },
    ]);
  }

  const s = getSuggestion();
  return s;
};

export const KwdPolicy = [
  {
    kwd: "POLICY",
    options: [
      {
        label: "$polciy_name",
        docs: `The name of the policy to be created. This must be distinct from the name of any other policy for the table.`,
      },
    ],
  },
  {
    kwd: "ON",
    expects: "table",
    dependsOn: "POLICY",
    docs: `The name (optionally schema-qualified) of the table the policy applies to.`,
  },
  {
    kwd: "AS",
    dependsOn: "ON",
    optional: true,
    options: [
      {
        label: "PERMISSIVE",
        docs: `Specify that the policy is to be created as a permissive policy. All permissive policies which are applicable to a given query will be combined together using the Boolean “OR” operator. By creating permissive policies, administrators can add to the set of records which can be accessed. Policies are permissive by default.`,
      },
      {
        label: "RESTRICTIVE",
        docs: `Specify that the policy is to be created as a restrictive policy. All restrictive policies which are applicable to a given query will be combined together using the Boolean “AND” operator. By creating restrictive policies, administrators can reduce the set of records which can be accessed as all restrictive policies must be passed for each record.

Note that there needs to be at least one permissive policy to grant access to records before restrictive policies can be usefully used to reduce that access. If only restrictive policies exist, then no records will be accessible. When a mix of permissive and restrictive policies are present, a record is only accessible if at least one of the permissive policies passes, in addition to all the restrictive policies.`,
      },
    ],
    docs: `Specifies how multiple policies will be combined: either OR (for permissive policies, which are the default) or using AND (for restrictive policies). Policies are permissive by default.`,
  },
  {
    kwd: "FOR",
    options: POLICY_FOR,
    dependsOn: "ON",
    optional: true,
    docs: `The command to which the policy applies. Valid options are ALL, SELECT, INSERT, UPDATE, and DELETE. ALL is the default. See below for specifics regarding how these are applied.`,
  },
  {
    kwd: "TO",
    expects: "role",
    optional: true,
    dependsOn: "ON",
    docs: `The role(s) to which the policy is to be applied. The default is PUBLIC, which will apply the policy to all roles.`,
  },
  {
    kwd: "USING",
    expects: "(condition)",
    dependsOn: "ON",
    optional: true,
    docs: `Any SQL conditional expression (returning boolean). The conditional expression cannot contain any aggregate or window functions. This expression will be added to queries that refer to the table if row-level security is enabled. Rows for which the expression returns true will be visible. Any rows for which the expression returns false or null will not be visible to the user (in a SELECT), and will not be available for modification (in an UPDATE or DELETE). Such rows are silently suppressed; no error is reported.`,
  },
  {
    kwd: "WITH CHECK",
    expects: "(condition)",
    dependsOn: "ON",
    optional: true,
    docs: `Any SQL conditional expression (returning boolean). The conditional expression cannot contain any aggregate or window functions. This expression will be used in INSERT and UPDATE queries against the table if row-level security is enabled. Only rows for which the expression evaluates to true will be allowed. An error will be thrown if the expression evaluates to false or null for any of the records inserted or any of the records that result from the update. Note that the check_expression is evaluated against the proposed new contents of the row, not the original contents.`,
  },
] as const satisfies KWD[];
