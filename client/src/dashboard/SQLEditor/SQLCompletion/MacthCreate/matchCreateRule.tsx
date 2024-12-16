import { getCurrentCodeBlock } from "../completionUtils/getCodeBlock";
import { getMatch } from "../getMatch";
import type { SQLMatchContext } from "../registerSuggestions";
import type { KWD } from "../withKWDs";
import { withKWDs } from "../withKWDs";

export const matchCreateRule = async ({
  cb,
  ss,
  sql,
  setS,
}: SQLMatchContext) => {
  const COMMANDS = ["SELECT", "INSERT", "UPDATE", "DELETE"];
  if (cb.currNestingId) {
    const startTkn = cb.tokens.findLast(
      (t) =>
        t.offset <= cb.offset &&
        t.nestingId === cb.currNestingId &&
        t.text === "(",
    );
    const endTkn = cb.tokens.find(
      (t) =>
        t.offset >= cb.offset &&
        t.nestingId === cb.currNestingId &&
        t.text === ")",
    );
    const command = cb.tokens.find((t) =>
      COMMANDS.includes(t.text.toUpperCase()),
    )?.textLC;
    if (startTkn && command) {
      const nestedCb = await getCurrentCodeBlock(cb.model, cb.position, [
        startTkn.offset,
        endTkn?.offset ?? cb.offset + 1,
      ]);
      const { firstTry, match } = await getMatch({
        cb: nestedCb,
        ss,
        sql,
        setS,
        filter: ["MatchInsert", "MatchSelect", "MatchUpdate", "MatchDelete"],
      });

      const res = firstTry ??
        match?.result({ cb: nestedCb, ss, setS, sql }) ?? {
          suggestions: ss.filter(
            (s) =>
              s.topKwd &&
              COMMANDS.some((c) => s.name.toUpperCase().startsWith(c)),
          ),
        };
      return res;
    }
  }
  return withKWDs(
    [
      {
        kwd: "RULE",
        options: ["$rule_name"],
        docs: `The PostgreSQL rule system allows one to define an alternative action to be performed on insertions, updates, or deletions in database tables. Roughly speaking, a rule causes additional commands to be executed when a given command on a given table is executed. Alternatively, an INSTEAD rule can replace a given command by another, or cause a command not to be executed at all. Rules are used to implement SQL views as well. It is important to realize that a rule is really a command transformation mechanism, or command macro. The transformation happens before the execution of the command starts. If you actually want an operation that fires independently for each physical row, you probably want to use a trigger, not a rule. More information about the rules system is in Chapter 41.`,
      },
      {
        kwd: "AS ON",
        dependsOn: "RULE",
        options: COMMANDS,
        docs: `The event is one of SELECT, INSERT, UPDATE, or DELETE. Note that an INSERT containing an ON CONFLICT clause cannot be used on tables that have either INSERT or UPDATE rules. Consider using an updatable view instead.`,
      },
      {
        kwd: "TO",
        expects: "table",
        docs: `Expects the name (optionally schema-qualified) of the table or view the rule applies to.`,
        dependsOn: "AS ON",
      },
      {
        kwd: "DO",
        options: [
          {
            label: "()",
            insertText: `(\n $0\n)`,
            docs: `ALSO indicates that the commands should be executed in addition to the original command.\n\nIf neither ALSO nor INSTEAD is specified, ALSO is the default.`,
          },
          {
            label: "ALSO",
            insertText: `ALSO (\n $0\n)`,
            docs: `ALSO indicates that the commands should be executed in addition to the original command.\n\nIf neither ALSO nor INSTEAD is specified, ALSO is the default.`,
          },
          {
            label: "INSTEAD",
            insertText: `INSTEAD (\n $0\n)`,
            docs: `INSTEAD indicates that the commands should be executed instead of the original command.`,
          },
        ],
        optional: true,
        docs: `Specifies if the original commands get executed as well. If neither ALSO nor INSTEAD is specified, ALSO is the default.`,
        dependsOn: "TO",
      },
    ] satisfies KWD[],
    { cb, ss, setS, sql },
  ).getSuggestion();
};
