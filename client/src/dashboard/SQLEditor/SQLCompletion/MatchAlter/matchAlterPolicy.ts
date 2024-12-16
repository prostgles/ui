import { asName } from "prostgles-types";
import { KwdPolicy } from "../MacthCreate/matchCreatePolicy";
import type {
  ParsedSQLSuggestion,
  SQLMatchContext,
} from "../registerSuggestions";
import type { KWD } from "../withKWDs";
import { withKWDs } from "../withKWDs";

export const matchAlterPolicy = async ({
  cb,
  ss,
  sql,
  setS,
}: SQLMatchContext): Promise<{ suggestions: ParsedSQLSuggestion[] }> => {
  if (cb.ltoken?.textLC === "policy") {
    return {
      suggestions: ss
        .filter((s) => s.type === "policy")
        .map((s) => ({
          ...s,
          insertText: `${s.policyInfo!.escaped_identifier} ON ${asName(s.policyInfo!.tablename)}`,
        })),
    };
  }
  const alterKwd = [
    {
      kwd: "RENAME TO",
      docs: `Change policy name`,
      dependsOn: "ON",
      optional: true,
    },
    ...KwdPolicy.filter(
      (k) =>
        k.kwd !== "POLICY" &&
        k.kwd !== "AS" &&
        k.kwd !== "FOR" &&
        k.kwd !== "ON",
    ),
    {
      kwd: ";",
      dependsOn: "ON",
      optional: true,
    },
  ] satisfies KWD[];
  const { getSuggestion } = withKWDs(alterKwd, { cb, ss, setS, sql });

  const s = await getSuggestion();
  return s;
};
