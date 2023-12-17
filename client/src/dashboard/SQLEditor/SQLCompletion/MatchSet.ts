import { omitKeys } from "../../../utils";
import { asListObject } from "../SQLEditorSuggestions";
import { suggestSnippets } from "./CommonMatchImports";
import { getExpected } from "./getExpected";
import { SQLMatcher } from "./registerSuggestions";
import { KWD, suggestKWD, withKWDs } from "./withKWDs";
import { SQLHandler } from "prostgles-types";

export const MatchSet: SQLMatcher = {
  match: ({ ftoken }) => ftoken?.textLC === "set" || ftoken?.textLC === "show",
  result: async (args) => {

    const { cb, getKind, ss, setS: settingSuggestions, sql } = args;
    const { ltoken } = cb; 
    const _suggestKWD = (vals: string[], sortText?: string) => suggestKWD(getKind, vals, sortText);

    if(cb.prevLC.startsWith("set session authorization")){
      return {
        suggestions: getExpected("user", cb, ss).suggestions.concat(_suggestKWD(["DEFAULT"]).suggestions as any)
      }
    }

    if(ltoken?.textLC === "to"){

      if(["timezone", "time zone"].some(v => cb.prevLC.includes(v)) && sql){
        const timeZones = await getTimeZones(sql);
        return suggestSnippets(timeZones.map(t => ({
          label: t.name,
          insertText: `'${t.name}'`,
          docs: asListObject(t),
          kind: getKind("keyword")
        })))
      }

      const settingInfo = settingSuggestions.find(s => s.name === cb.identifiers.at(-1))?.settingInfo;
      const docs = settingInfo?.description;
      return suggestSnippets([
        { label: "DEFAULT", docs },
        ...(
          settingInfo?.vartype === "bool"? [{ label: `ON`, docs }, { label: `OFF`, docs }] : 
          settingInfo?.vartype === "string"? [
            { label: "'$setting_string_value'", docs }
          ] : 
          settingInfo?.vartype === "integer"? [
            { label: settingInfo.min_val ?? "", docs: "Minimum value" + `\n\n${docs}` }, 
            { label: settingInfo.max_val ?? "", docs: "Maximum value" + `\n\n${docs}` }
          ] : 
          settingInfo?.enumvals?.length? settingInfo.enumvals.map(label => ({ label, docs: (settingInfo.reset_val === label? "Default" : "") + + `\n\n${docs}` })) : 
        []),
      ])
    }
    const extraSettings = [
      { label: "SESSION", expects: "setting", docs: `Specifies that the command takes effect for the current session. (This is the default if neither SESSION nor LOCAL appears.)` },
      { label: "SESSION AUTHORIZATION", role: "user", docs: "Set the session user identifier and the current user identifier of the current session" },
      { label: "LOCAL", docs: `Specifies that the command takes effect for only the current transaction. After COMMIT or ROLLBACK, the session-level setting takes effect again. Issuing this outside of a transaction block emits a warning and otherwise has no effect.` },
      { label: "ALL" },
      { label: "SCHEMA", options: ss => ss.filter(s => s.type === "schema").map(s => ({ ...s, insertText: `'${s.name}'`})), docs: `SET SCHEMA 'value' is an alias for SET search_path TO value. Only one schema can be specified using this syntax.` },
      { label: "SEED", options: ["-1", "1"], docs: `Sets the internal seed for the random number generator (the function random). Allowed values are floating-point numbers between -1 and 1 inclusive. The seed can also be set by invoking the function setseed` },
      { label: "TIME ZONE", docs: `SET TIME ZONE 'value' is an alias for SET timezone TO 'value'. The syntax SET TIME ZONE allows special syntax for the time zone specification. Here are examples of valid values: 'PST8PDT', 'Europe/Rome', -7, INTERVAL '-08:00' HOUR TO MINUTE` },
    ] as const;
    return withKWDs([
      { kwd: "SHOW", options: settingSuggestions,  },
      { kwd: "SET", 
        options: [
          ...extraSettings,
          ...settingSuggestions
        ].map(o => ({ ...o, kind: getKind("setting") })),
      },
      { kwd: "TO", dependsOn: "SET" },
      ...extraSettings.map(d => ({
        kwd: d.label,
        dependsOn: d.label,
        ...omitKeys(d, ["label"]),
      }))
    ] satisfies KWD[], cb, getKind, ss).getSuggestion()

  }
}

const getTimeZones = async (sql: SQLHandler) => {
  return (await sql(`
    SELECT *
    FROM pg_catalog.pg_timezone_names
  `, {}, { returnType: "rows" })) as { 
    name: string;
    abbrev: string;
    utc_offset: string;
    is_dst: boolean; 
  }[];
}