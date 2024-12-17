import type {
  ParsedSQLSuggestion,
  SQLMatchContext,
} from "../registerSuggestions";
import type { KWD } from "../withKWDs";
import { withKWDs } from "../withKWDs";

export const matchCreateTrigger = ({ cb, setS, sql, ss }: SQLMatchContext) => {
  const getTriggerFuncs = (s: ParsedSQLSuggestion[]) => {
    return s
      .filter((s) => s.funcInfo?.restype?.toLowerCase() === "trigger")
      .map((s) => ({
        ...s,
        sortText:
          s.funcInfo!.schema === "pg_catalog" ? "c"
          : s.funcInfo!.schema === "public" ? "a"
          : "b",
      }));
    // .slice(0).sort((a, b) => a.sortText.localeCompare(b.sortText));
  };

  const types = ["BEFORE", "AFTER", "INSTEAD OF"];
  const actions = ["UPDATE", "DELETE", "INSERT"];
  return withKWDs(
    [
      { kwd: "TRIGGER", expects: "string", docs: "Trigger name" },
      ...types.map(
        (type) =>
          ({
            kwd: type,
            docs: `Determines whether the function is called before, after, or instead of the event. A constraint trigger can only be specified as AFTER.
        
A common use of a BEFORE trigger is to set a timestamp column to "now" before the data has been inserted.

A common use of an AFTER trigger is to populate an audit/history table with the changes.`,
            options: [{ label: actions.join(" OR ") }].concat(
              actions.map((label) => ({ label })),
            ),
            excludeIf: types,
          }) satisfies KWD,
      ),
      { kwd: "ON", expects: "table" },
      {
        kwd: "OF",
        expects: "column",
        docs: "Only execute the function if the specified column was targeted",
      },
      {
        kwd: "REFERENCING",
        options: ["NEW TABLE AS new OLD TABLE AS old"].map((label) => ({
          label,
        })),
        dependsOn: "AFTER",
        // excludeIf: ["BEFORE"],
        docs: `The REFERENCING option enables collection of transition relations, which are row sets that include all of the rows inserted, deleted, or modified by the current SQL statement. This feature lets the trigger see a global view of what the statement did, not just one row at a time. This option is only allowed for an AFTER trigger that is not a constraint trigger; also, if the trigger is an UPDATE trigger, it must not specify a column_name list. OLD TABLE may only be specified once, and only for a trigger that can fire on UPDATE or DELETE; it creates a transition relation containing the before-images of all rows updated or deleted by the statement. Similarly, NEW TABLE may only be specified once, and only for a trigger that can fire on UPDATE or INSERT; it creates a transition relation containing the after-images of all rows updated or inserted by the statement.`,
      },
      {
        kwd: "FOR EACH",
        dependsOn: "ON",
        options: ["ROW", "STATEMENT"].map((label) => ({ label })),
        docs: `This specifies whether the trigger function should be fired once for every row affected by the trigger event, or just once per SQL statement. If neither is specified, FOR EACH STATEMENT is the default. Constraint triggers can only be specified FOR EACH ROW.`,
      },
      {
        kwd: "WHEN",
        expects: "condition",
        dependsOn: "ON",
        docs: `A Boolean expression that determines whether the trigger function will actually be executed. If WHEN is specified, the function will only be called if the condition returns true. In FOR EACH ROW triggers, the WHEN condition can refer to columns of the old and/or new row values by writing OLD.column_name or NEW.column_name respectively. Of course, INSERT triggers cannot refer to OLD and DELETE triggers cannot refer to NEW.`,
      },
      {
        kwd: "EXECUTE FUNCTION",
        options: getTriggerFuncs,
        dependsOn: "FOR EACH",
        docs: `A user-supplied function that is declared as taking no arguments and returning type trigger, which is executed when the trigger fires.`,
      },
      {
        kwd: "EXECUTE PROCEDURE",
        options: getTriggerFuncs,
        dependsOn: "FOR EACH",
        docs: `A user-supplied function that is declared as taking no arguments and returning type trigger, which is executed when the trigger fires.`,
      },
    ] as const,
    { cb, ss, setS, sql },
  ).getSuggestion();
};
