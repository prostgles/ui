import { getMonaco } from "../../SQLEditor";
import { suggestSnippets, type MinimalSnippet } from "../CommonMatchImports";
import { MatchSelect } from "../MatchSelect";
import type { SQLMatcherResultArgs } from "../registerSuggestions";
import { withKWDs, type KWD } from "../withKWDs";
import { getUserSchemaNames } from "./matchCreateTable";

export const matchCreateView = async (args: SQLMatcherResultArgs) => {
  const { cb, ss, setS, sql } = args;

  if (cb.prevTokens.some((t) => t.textLC === "select")) {
    return MatchSelect.result({ cb, ss, setS, sql });
  }
  if (cb.prevLC.endsWith(" as") && cb.prevTokens.length < 5) {
    return suggestSnippets([{ label: "SELECT" }]);
  }

  const monaco = await getMonaco();
  if (cb.ltoken?.textLC === "view") {
    const userSchemas = getUserSchemaNames(ss);
    const ms: MinimalSnippet[] = [
      "$new_or_existing_view_name",
      "IF NOT EXISTS",
      ...userSchemas.map((s) => `${s}.$new_or_existing_view_name`),
    ].map((label) => ({ label }));
    if (cb.prevTokens.some((t) => t.textLC === "replace")) {
      const views = await ss.filter((s) => s.type === "view");
      return suggestSnippets([
        ...ms,
        ...views.map((v) => ({
          ...v,
          insertText: `${v.escapedIdentifier} AS \n${v.view!.definition}`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.None,
          sortText: v.schema === "public" ? "0" : "1",
        })),
      ]);
    }
    return suggestSnippets(ms);
  }

  const withOptions = [
    {
      label: "check_option",
      options: [
        {
          label: "cascaded",
          docs: `New rows are checked against the conditions of the view and all underlying base views. If the CHECK OPTION is specified, and neither LOCAL nor CASCADED is specified, then CASCADED is assumed.`,
        },
        {
          label: "local",
          docs: `New rows are only checked against the conditions defined directly in the view itself. Any conditions defined on underlying base views are not checked (unless they also specify the CHECK OPTION).`,
        },
      ],
      docs: "Specifies the level of checking to be done on data changes to the view. The options are LOCAL and CASCADED.",
    },
    {
      label: "security_barrier",
      options: [{ label: "true" }, { label: "false" }],
      docs: `This should be used if the view is intended to provide row-level security`,
    },
    {
      label: "security_invoker",
      options: [{ label: "true" }, { label: "false" }],
      docs: `This option causes the underlying base relations to be checked against the privileges of the user of the view rather than the view owner. See the notes below for full details.`,
    },
  ] satisfies readonly (MinimalSnippet & { options: MinimalSnippet[] })[];

  if (cb.currNestingFunc?.textLC === "with") {
    return withKWDs(
      withOptions.map(
        (o) =>
          ({
            kwd: o.label,
            options: o.options,
            docs: o.docs,
            canRepeat: false,
            expects: "=option",
          }) satisfies KWD,
      ),
      { sql, cb, ss, setS },
    ).getSuggestion(", ");
  }
  const res = await withKWDs(
    [
      {
        kwd: "AS",
        docs: "Precedes the SELECT statement that will be used to create the view.",
      },
      {
        kwd: "SELECT",
        dependsOn: "AS",
        docs: "The SELECT statement that will be used to create the view.",
      },
      {
        kwd: "WITH",
        expects: "(options)",
        docs: "This clause specifies optional parameters for a view",
        optional: true,
        excludeIf: () => cb.prevTokens.some((t) => t.textLC === "as"),
        options: withOptions,
      },
    ] satisfies KWD[],
    { sql, cb, ss, setS, opts: { notOrdered: true } },
  ).getSuggestion();
  return res;
};
