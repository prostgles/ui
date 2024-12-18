import { tout } from "../../../../pages/ElectronSetup";
import { suggestSnippets } from "../CommonMatchImports";
import {
  ALTER_COL_ACTIONS,
  PG_TABLE_CONSTRAINTS,
  REFERENCE_CONSTRAINT_OPTIONS_KWDS,
  TABLE_CONS_TYPES,
} from "../TableKWDs";
import { getExpected } from "../getExpected";
import {
  type ParsedSQLSuggestion,
  type SQLMatchContext,
} from "../registerSuggestions";
import type { KWD } from "../withKWDs";
import { withKWDs } from "../withKWDs";

export const matchAlterTable = async ({
  cb,
  ss,
  sql,
  setS,
}: SQLMatchContext): Promise<{ suggestions: ParsedSQLSuggestion[] }> => {
  if (cb.ltoken?.textLC === "trigger") {
    const suggestions = ss.filter(
      (s) =>
        s.triggerInfo &&
        cb.prevTokens.some((t) =>
          t.text.includes(s.triggerInfo!.event_object_table),
        ),
    );
    if (suggestions.length === 0) {
      return suggestSnippets([
        { label: "No triggers found for this table", insertText: " " },
      ]);
    }
    return {
      suggestions,
    };
  }

  // if (cb.prevTokens.length === 2) {
  //   return getExpected("table", cb, ss);
  // }

  if (cb.prevTokens.length === 3 && cb.currToken?.textLC !== ".") {
    return withKWDs(
      ALTER_TABLE_ACTIONS.map(({ label, docs }) => ({ kwd: label, docs })),
      { cb, ss, setS, sql },
    ).getSuggestion();
  }

  if (cb.prevLC.includes("alter column") && !cb.prevLC.endsWith("column")) {
    return withKWDs(ALTER_COL_ACTIONS, { cb, ss, setS, sql }).getSuggestion();
  }
  if (cb.prevLC.includes("drop column") && !cb.prevLC.endsWith("column")) {
    return suggestSnippets(["CASCADE", "RESTRICT"].map((label) => ({ label })));
  }
  if (cb.prevLC.includes("rename column")) {
    if (!cb.prevLC.endsWith("column")) {
      if (cb.l1token?.textLC == "column") {
        return suggestSnippets(
          ["TO $new_col_name"].map((label) => ({ label })),
        );
      }
      if (cb.ltoken?.textLC == "to") {
        return suggestSnippets([{ label: "$new_col_name" }]);
      }
    }
  }

  const k = withKWDs(ALTER_TABLE_KWD, { cb, ss, setS, sql });

  const result = await k.getSuggestion();
  return result;
};

const AddOpts = [
  {
    label: "COLUMN",
    docs: "Creates a new column in this table",
  },
  ...PG_TABLE_CONSTRAINTS.map((d) => ({ ...d, label: d.kwd, docs: d.docs })),
];

const ALTER_TABLE_KWD = [
  {
    kwd: "ALTER TABLE",
    docs: "Alters a table",
    expects: "table",
  },
  {
    kwd: "ADD",
    justAfter: ["TABLE"],
    options: AddOpts,
    excludeIf: (cb) => !cb.prevTokens.some((t) => t.textLC === "add"),
  },
  ...AddOpts.map(
    (opt) =>
      ({
        ...(opt as any),
        kwd: `ADD ${opt.label}`,
        excludeIf: (cb) => cb.prevTokens.some((t) => t.textLC === "add"),
      }) satisfies KWD,
  ),
  {
    kwd: "DROP",
    docs: "Drops a table related object",
    justAfter: ["TABLE"],
    excludeIf: (cb) => cb.tokens.length > 3,
    options: [{ label: "CONSTRAINT" }, { label: "COLUMN" }],
  },
  ...["RENAME", "ALTER", "DROP"].map((kwd) => ({
    kwd: `${kwd} COLUMN`,
    expects: "column",
    excludeIf: (cb) => cb.prevTokens.length > 3,
  })),
  {
    kwd: "COLUMN",
    expects: "column",
    exactlyAfter: ["ADD", "DROP", "ALTER", "RENAME"],
  },
  {
    kwd: "DISABLE TRIGGER",
    expects: "trigger",
    options: [{ label: "ALL" }],
    excludeIf: (cb) => cb.prevTokens.length > 3,
  },
  {
    kwd: "ENABLE TRIGGER",
    expects: "trigger",
    options: [{ label: "ALL" }],
    excludeIf: (cb) => cb.prevTokens.length > 3,
  },
  {
    kwd: "ENABLE ALWAYS TRIGGER",
    expects: "trigger",
    options: [{ label: "ALL" }],
    excludeIf: (cb) => cb.prevTokens.length > 3,
  },
  {
    kwd: "RENAME TO",
    docs: "Rename the table",
    excludeIf: (cb) => cb.prevTokens.length > 3,
  },
  {
    kwd: "ENABLE REPLICA TRIGGER",
    expects: "trigger",
    options: [{ label: "ALL" }],
    excludeIf: (cb) => cb.prevTokens.length > 3,
  },
  ...[
    "ENABLE ROW LEVEL SECURITY;",
    "DISABLE ROW LEVEL SECURITY;",
    "FORCE ROW LEVEL SECURITY;",
    "NO FORCE ROW LEVEL SECURITY;",
  ].map((kwd) => ({
    kwd,
    docs: `These forms control the application of row security policies belonging to the table. If enabled and no policies exist for the table, then a default-deny policy is applied. Note that policies can exist for a table even if row-level security is disabled. In this case, the policies will not be applied and the policies will be ignored. See also CREATE POLICY.`,
    excludeIf: (cb) => cb.prevTokens.length > 3,
  })),
  ...PG_TABLE_CONSTRAINTS.map((k) => ({
    ...k,
    exactlyAfter: ["ADD"],
  })),
  {
    kwd: "REFERENCES",
    expects: "table",
    dependsOn: "FOREIGN KEY",
  },
  ...REFERENCE_CONSTRAINT_OPTIONS_KWDS,
] as const satisfies readonly KWD[];

export const ALTER_TABLE_ACTIONS = [
  ...PG_TABLE_CONSTRAINTS.map(({ kwd: ConsType }) => ({
    label: `ADD ${ConsType}`,
    docs: `Adds a constraint of type ${ConsType}`,
  })),
  {
    label: "ADD COLUMN",
    docs: `This form adds a new column to the table, using the same syntax as CREATE TABLE. If IF NOT EXISTS is specified and a column already exists with this name, no error is thrown.`,
  },
  {
    label: "DROP COLUMN",
    docs: `This form drops a column from a table. Indexes and table constraints involving the column will be automatically dropped as well. Multivariate statistics referencing the dropped column will also be removed if the removal of the column would cause the statistics to contain data for only a single column. You will need to say CASCADE if anything outside the table depends on the column, for example, foreign key references or views. If IF EXISTS is specified and the column does not exist, no error is thrown. In this case a notice is issued instead.`,
  },
  { label: "ALTER COLUMN", docs: "This form alters a table column" },
  {
    label: "RENAME COLUMN $1 TO $2",
    docs: `The RENAME forms change the name of a table (or an index, sequence, view, materialized view, or foreign table), the name of an individual column in a table, or the name of a constraint of the table. When renaming a constraint that has an underlying index, the index is renamed as well. There is no effect on the stored data.`,
  },
  {
    label: "RENAME TO",
    docs: `The RENAME forms change the name of a table (or an index, sequence, view, materialized view, or foreign table), the name of an individual column in a table, or the name of a constraint of the table. When renaming a constraint that has an underlying index, the index is renamed as well. There is no effect on the stored data.`,
  },
  {
    label: `ADD CONSTRAINT \${1:constraint_name} \${2|${TABLE_CONS_TYPES}|} ($0)`,
    docs: `This form adds a new constraint to a table using the same constraint syntax as CREATE TABLE, plus the option NOT VALID, which is currently only allowed for foreign key and CHECK constraints.

Normally, this form will cause a scan of the table to verify that all existing rows in the table satisfy the new constraint. But if the NOT VALID option is used, this potentially-lengthy scan is skipped. The constraint will still be enforced against subsequent inserts or updates (that is, they'll fail unless there is a matching row in the referenced table, in the case of foreign keys, or they'll fail unless the new row matches the specified check condition). But the database will not assume that the constraint holds for all rows in the table, until it is validated by using the VALIDATE CONSTRAINT option. See Notes below for more information about using the NOT VALID option.

Although most forms of ADD table_constraint require an ACCESS EXCLUSIVE lock, ADD FOREIGN KEY requires only a SHARE ROW EXCLUSIVE lock. Note that ADD FOREIGN KEY also acquires a SHARE ROW EXCLUSIVE lock on the referenced table, in addition to the lock on the table on which the constraint is declared.

Additional restrictions apply when unique or primary key constraints are added to partitioned tables; see CREATE TABLE. Also, foreign key constraints on partitioned tables may not be declared NOT VALID at present.`,
  },
  {
    label:
      "ALTER CONSTRAINT ${1:table_constraint} ${2|DEFERRABLE,NOT DEFERRABLE|} ${3|INITIALLY DEFERRED,INITIALLY IMMEDIATE|}",
    docs: `This form alters the attributes of a constraint that was previously created. Currently only foreign key constraints may be altered.`,
  },
  {
    label: "VALIDATE CONSTRAINT ${1:table_constraint}",
    docs: `This form validates a foreign key or check constraint that was previously created as NOT VALID, by scanning the table to ensure there are no rows for which the constraint is not satisfied. Nothing happens if the constraint is already marked valid. (See Notes below for an explanation of the usefulness of this command.)

This command acquires a SHARE UPDATE EXCLUSIVE lock.
    `,
  },
  {
    label: "DROP CONSTRAINT",
    docs: `This form drops the specified constraint on a table, along with any index underlying the constraint. If IF EXISTS is specified and the constraint does not exist, no error is thrown. In this case a notice is issued instead.`,
  },

  ...[
    "DISABLE TRIGGER",
    "ENABLE TRIGGER",
    "ENABLE REPLICA TRIGGER",
    "ENABLE ALWAYS TRIGGER",
  ].map((label) => ({
    label,
    docs: `These forms configure the firing of trigger(s) belonging to the table. A disabled trigger is still known to the system, but is not executed when its triggering event occurs. For a deferred trigger, the enable status is checked when the event occurs, not when the trigger function is actually executed. One can disable or enable a single trigger specified by name, or all triggers on the table, or only user triggers (this option excludes internally generated constraint triggers such as those that are used to implement foreign key constraints or deferrable uniqueness and exclusion constraints). Disabling or enabling internally generated constraint triggers requires superuser privileges; it should be done with caution since of course the integrity of the constraint cannot be guaranteed if the triggers are not executed.

The trigger firing mechanism is also affected by the configuration variable session_replication_role. Simply enabled triggers (the default) will fire when the replication role is “origin” (the default) or “local”. Triggers configured as ENABLE REPLICA will only fire if the session is in “replica” mode, and triggers configured as ENABLE ALWAYS will fire regardless of the current replication role.

The effect of this mechanism is that in the default configuration, triggers do not fire on replicas. This is useful because if a trigger is used on the origin to propagate data between tables, then the replication system will also replicate the propagated data, and the trigger should not fire a second time on the replica, because that would lead to duplication. However, if a trigger is used for another purpose such as creating external alerts, then it might be appropriate to set it to ENABLE ALWAYS so that it is also fired on replicas.

This command acquires a SHARE ROW EXCLUSIVE lock.`,
  })),

  ...[
    "DISABLE RULE $rewrite_rule_name;",
    "ENABLE RULE $rewrite_rule_name;",
    "ENABLE REPLICA RULE ${1:rewrite_rule_name}",
    "ENABLE ALWAYS RULE ${1:rewrite_rule_name}",
  ].map((label) => ({
    label,
    docs: `These forms configure the firing of rewrite rules belonging to the table. A disabled rule is still known to the system, but is not applied during query rewriting. The semantics are as for disabled/enabled triggers. This configuration is ignored for ON SELECT rules, which are always applied in order to keep views working even if the current session is in a non-default replication role.

The rule firing mechanism is also affected by the configuration variable session_replication_role, analogous to triggers as described above.`,
  })),
  ...[
    "ENABLE ROW LEVEL SECURITY;",
    "DISABLE ROW LEVEL SECURITY;",
    "FORCE ROW LEVEL SECURITY;",
    "NO FORCE ROW LEVEL SECURITY;",
  ].map((label) => ({
    label,
    docs: `These forms control the application of row security policies belonging to the table. If enabled and no policies exist for the table, then a default-deny policy is applied. Note that policies can exist for a table even if row-level security is disabled. In this case, the policies will not be applied and the policies will be ignored. See also CREATE POLICY.`,
  })),
  {
    label: "CLUSTER ON index_name",
    docs: `This form selects the default index for future CLUSTER operations. It does not actually re-cluster the table.

Changing cluster options acquires a SHARE UPDATE EXCLUSIVE lock.`,
  },
  {
    label: "SET WITHOUT CLUSTER",
    docs: `This form removes the most recently used CLUSTER index specification from the table. This affects future cluster operations that don't specify an index.

Changing cluster options acquires a SHARE UPDATE EXCLUSIVE lock.`,
  },
  {
    label: "SET WITHOUT OIDS",
    docs: `Backward-compatible syntax for removing the oid system column. As oid system columns cannot be added anymore, this never has an effect.`,
  },
  {
    label: "SET ACCESS METHOD ${1:new_access_method}",
    docs: `This form changes the access method of the table by rewriting it`,
  },
  {
    label: "SET TABLESPACE ${1:new_tablespace}",
    docs: `This form changes the table's tablespace to the specified tablespace and moves the data file(s) associated with the table to the new tablespace. Indexes on the table, if any, are not moved; but they can be moved separately with additional SET TABLESPACE commands. When applied to a partitioned table, nothing is moved, but any partitions created afterwards with CREATE TABLE PARTITION OF will use that tablespace, unless overridden by a TABLESPACE clause.

All tables in the current database in a tablespace can be moved by using the ALL IN TABLESPACE form, which will lock all tables to be moved first and then move each one. This form also supports OWNED BY, which will only move tables owned by the roles specified. If the NOWAIT option is specified then the command will fail if it is unable to acquire all of the locks required immediately. Note that system catalogs are not moved by this command; use ALTER DATABASE or explicit ALTER TABLE invocations instead if desired. The information_schema relations are not considered part of the system catalogs and will be moved. See also CREATE TABLESPACE.`,
  },
  {
    label: "SET ${1|LOGGED,UNLOGGED|}",
    docs: `This form changes the table from unlogged to logged or vice-versa (see UNLOGGED). It cannot be applied to a temporary table.

This also changes the persistence of any sequences linked to the table (for identity or serial columns). However, it is also possible to change the persistence of such sequences separately.`,
  },
  {
    label: "SET ( storage_parameter [= value] [, ... ] )",
    docs: `This form changes one or more storage parameters for the table. See Storage Parameters in the CREATE TABLE documentation for details on the available parameters. Note that the table contents will not be modified immediately by this command; depending on the parameter you might need to rewrite the table to get the desired effects. That can be done with VACUUM FULL, CLUSTER or one of the forms of ALTER TABLE that forces a table rewrite. For planner related parameters, changes will take effect from the next time the table is locked so currently executing queries will not be affected.

SHARE UPDATE EXCLUSIVE lock will be taken for fillfactor, toast and autovacuum storage parameters, as well as the planner parameter parallel_workers.`,
  },
  {
    label: "RESET ( storage_parameter [, ... ] )",
    docs: "This form resets one or more storage parameters to their defaults. As with SET, a table rewrite might be needed to update the table entirely.",
  },
  {
    label: "INHERIT $parent_table",
    docs: `This form adds the target table as a new child of the specified parent table. Subsequently, queries against the parent will include records of the target table. To be added as a child, the target table must already contain all the same columns as the parent (it could have additional columns, too). The columns must have matching data types, and if they have NOT NULL constraints in the parent then they must also have NOT NULL constraints in the child.

There must also be matching child-table constraints for all CHECK constraints of the parent, except those marked non-inheritable (that is, created with ALTER TABLE ... ADD CONSTRAINT ... NO INHERIT) in the parent, which are ignored; all child-table constraints matched must not be marked non-inheritable. Currently UNIQUE, PRIMARY KEY, and FOREIGN KEY constraints are not considered, but this might change in the future.`,
  },
  {
    label: "NO INHERIT $parent_table",
    docs: "This form removes the target table from the list of children of the specified parent table. Queries against the parent table will no longer include records drawn from the target table. ",
  },
  {
    label: "OF $type_name",
    docs: "This form links the table to a composite type as though CREATE TABLE OF had formed it. The table's list of column names and types must precisely match that of the composite type. The table must not inherit from any other table. These restrictions ensure that CREATE TABLE OF would permit an equivalent table definition.",
  },
  {
    label: "NOT OF",
    docs: "This form dissociates a typed table from its type.",
  },
  {
    label: "OWNER TO ${1|$new_owner,CURRENT_ROLE,CURRENT_USER,SESSION_USER|}",
    docs: "",
  },
  {
    label:
      "REPLICA IDENTITY ${1|DEFAULT,USING INDEX $index_name,FULL,NOTHING|}",
    docs: "",
  },
];
