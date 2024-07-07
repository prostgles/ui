
import { isDefined, pickKeys } from "prostgles-types";
import { asSQL } from "./KEYWORDS";
import type { ParsedSQLSuggestion } from "./registerSuggestions";
import type { KWD } from "./withKWDs";
 

export const PG_COLUMN_CONSTRAINTS = [
  { kwd: "GENERATED", 
    options: [
      { label: "BY DEFAULT AS IDENTITY", docs: `Instructs PostgreSQL to generate a value for the identity column. However, if you supply a value for insert or update, PostgreSQL will use that value to insert into the identity column instead of using the system-generated value.` },
      { label: "ALWAYS AS IDENTITY", docs: `Instructs PostgreSQL to always generate a value for the identity column. If you attempt to insert (or update) values into the GENERATED ALWAYS AS IDENTITY column, PostgreSQL will issue an error.` },
      { 
        label: "ALWAYS AS ($0 ) STORED", 
        docs: `A stored generated column is computed when it is written (inserted or updated) and occupies storage as if it were a normal column\n\n` + 
        asSQL([
          `CREATE TABLE people (`,
          `   ...,`,
          `   height_cm numeric,`,
          `   height_in numeric GENERATED ALWAYS AS (height_cm / 2.54) STORED`,
          `);`
        ].join("\n"))
      },
    ], 
    docs: `A generated column is a special column that is always computed from other columns. Thus, it is for columns what a view is for tables. There are two kinds of generated columns: stored and virtual. A stored generated column is computed when it is written (inserted or updated) and occupies storage as if it were a normal column. A virtual generated column occupies no storage and is computed when it is read. Thus, a virtual generated column is similar to a view and a stored generated column is similar to a materialized view (except that it is always updated automatically). PostgreSQL currently implements only stored generated columns.`
  }, 
  { kwd: "NOT NULL", docs: "Constraint ensuring this column cannot be NULL. By default columns can have NULL values if no constraints are specified." }, 
  { kwd: "REFERENCES", expects: "table", docs: "A foreign key constraint specifies that the values in a column (or a group of columns) must match the values appearing in some row of another table. We say this maintains the referential integrity between two related tables. The referenced column/s must be unique.\nhttps://www.postgresql.org/docs/current/tutorial-fk.html\n\n" + asSQL("product_id INTEGER REFERENCES products (id) ") }, 
  { kwd: "PRIMARY KEY", docs: "A primary key constraint indicates that a column, or group of columns, can be used as a unique identifier for rows in the table. This requires that the values be both unique and not null." }, 
  { kwd: "DEFAULT", expects: "function",  docs: "A column can be assigned a default value. When a new row is created and no values are specified for some of the columns, those columns will be filled with their respective default values. If no default value is declared explicitly, the default value is the null value. \n" + asSQL("/* For example */\ncreated_at TIMESTAMP DEFAULT now()") }, 
  { kwd: "CHECK", expects: "(condition)", docs: "Specify that the value in a certain column must satisfy a Boolean (truth-value) expression. For instance, to require positive product prices, you could use: \n" + asSQL(`CHECK (price > 0)`) },
  { kwd: "UNIQUE", expects: "(column)", docs: "The UNIQUE constraint specifies that a group of one or more columns of a table can contain only unique values. For the purpose of a unique constraint, null values are not considered equal, unless NULLS NOT DISTINCT is specified.Adding a unique constraint will automatically create a unique btree index on the column or group of columns used in the constraint." },
] as const satisfies readonly KWD[];

/** Used in ADD CONSTRAINT. These exclude constraints that target single columns only. */
export const PG_TABLE_CONSTRAINTS = [
  { 
    kwd: "FOREIGN KEY",
    expects: "(column)", 
    docs: PG_COLUMN_CONSTRAINTS.find(c => c.kwd === "REFERENCES")!.docs 
  },
  { 
    kwd: "PRIMARY KEY",
    expects: "(column)", 
    docs: PG_COLUMN_CONSTRAINTS.find(c => c.kwd === "PRIMARY KEY")!.docs 
  },
  ...PG_COLUMN_CONSTRAINTS.filter(c => !(["REFERENCES", "DEFAULT", "NOT NULL", "PRIMARY KEY"] as const).some(v => v === c.kwd) ),
] as const satisfies readonly KWD[];

export const REFERENCES_COL_OPTS = [
  { kwd: "ON DELETE CASCADE", docs: "When a referenced row is deleted, row(s) referencing it should be automatically deleted as well" }, 
  { kwd: "ON DELETE SET NULL", docs: "When a referenced row is deleted referencing column(s) in the referencing row(s) to be set to NULL" }, 
  { kwd: "ON DELETE SET DEFAULT", docs: "When a referenced row is deleted referencing column(s) in the referencing row(s) to be set to their DEFAULT values" }, 
  { kwd: "ON DELETE RESTRICT", docs: "Prevents deletion of a referenced row" }, 
  { kwd: "ON DELETE NO ACTION", docs: "If any referencing rows still exist when the constraint is checked, an error is raised; this is the default behavior if you do not specify anything" }, 
  { kwd: "ON UPDATE CASCADE", docs: "When a referenced row is updated referencing column(s) in the referencing row(s) should be automatically updated as well" }, 
  { kwd: "ON UPDATE SET NULL", docs: "When a referenced row is updated referencing column(s) in the referencing row(s) should be automatically set to NULL" }, 
  { kwd: "ON UPDATE SET DEFAULT", docs: "When a referenced row is updated referencing column(s) in the referencing row(s) should be automatically set to their DEFAULT values" }, 
  { kwd: "ON UPDATE RESTRICT", docs: "Prevents updating a referenced row" }, 
  { kwd: "ON UPDATE NO ACTION", docs: "If any referencing rows still exist when the constraint is checked, an error is raised; this is the default behavior if you do not specify anything" }, 
] as const;

const REF_OPTS = [
  {
    label: "CASCADE", getInfo: (a?: "DELETE" | "UPDATE") => { 
      const d = "DELETE any rows referencing the deleted row";
      const u = "UPDATE the values of the referencing column(s) to the new values of the referenced columns";
      if (!a) return [d, u].join(" OR ")
      if (a === "DELETE") {
        return d;
      }
      return u;
    }
  },
  { label: "SET NULL", getInfo: (a?: "DELETE" | "UPDATE") => "Set the referencing column(s) to null" },
  { label: "RESTRICT", getInfo: (a?: "DELETE" | "UPDATE") => "Produce an error indicating that the deletion or update would create a foreign key constraint violation. This is the same as NO ACTION except that the check is not deferrable." },
  { label: "SET DEFAULT", getInfo: (a?: "DELETE" | "UPDATE") => "Set the referencing column(s) to their default values. (There must be a row in the referenced table matching the default values, if they are not null, or the operation will fail.)" }
] as const;

export const REFERENCE_CONSTRAINT_OPTIONS_KWDS = [
  {
    kwd: "ON DELETE",
    docs: `When the data in the referenced columns is deleted: `,
    options: REF_OPTS.map(d => ({
      label: d.label, docs: d.getInfo("DELETE")
    })),
    dependsOn: "REFERENCES"
  }, {
    kwd: "ON UPDATE",
    docs: `When the data in the referenced columns is updated: `,
    options: REF_OPTS.map(d => ({
      label: d.label, docs: d.getInfo("UPDATE")
    })),
    dependsOn: "REFERENCES"
  }
] as const satisfies readonly KWD[];



 
export const TABLE_CONS_TYPES = PG_TABLE_CONSTRAINTS.map(c => c.kwd);

export const ALTER_TABLE_ACTIONS = [
  ...(PG_TABLE_CONSTRAINTS.map(({ kwd: ConsType }) => ({
    label: `ADD ${ConsType}`,
    docs: `Adds a constraint of type ${ConsType}`
  }))),
  { label: "ADD COLUMN", docs: `This form adds a new column to the table, using the same syntax as CREATE TABLE. If IF NOT EXISTS is specified and a column already exists with this name, no error is thrown.` },
  { label: "DROP COLUMN", docs: `This form drops a column from a table. Indexes and table constraints involving the column will be automatically dropped as well. Multivariate statistics referencing the dropped column will also be removed if the removal of the column would cause the statistics to contain data for only a single column. You will need to say CASCADE if anything outside the table depends on the column, for example, foreign key references or views. If IF EXISTS is specified and the column does not exist, no error is thrown. In this case a notice is issued instead.` },
  { label: "ALTER COLUMN", docs: "This form alters a table column" },
  { label: "RENAME COLUMN $1 TO $2", docs: `The RENAME forms change the name of a table (or an index, sequence, view, materialized view, or foreign table), the name of an individual column in a table, or the name of a constraint of the table. When renaming a constraint that has an underlying index, the index is renamed as well. There is no effect on the stored data.` },
  { label: "RENAME TO", docs: `The RENAME forms change the name of a table (or an index, sequence, view, materialized view, or foreign table), the name of an individual column in a table, or the name of a constraint of the table. When renaming a constraint that has an underlying index, the index is renamed as well. There is no effect on the stored data.` },
  { 
    label: `ADD CONSTRAINT \${1:constraint_name} \${2|${TABLE_CONS_TYPES}|} ($0)`, 
    docs: `This form adds a new constraint to a table using the same constraint syntax as CREATE TABLE, plus the option NOT VALID, which is currently only allowed for foreign key and CHECK constraints.

Normally, this form will cause a scan of the table to verify that all existing rows in the table satisfy the new constraint. But if the NOT VALID option is used, this potentially-lengthy scan is skipped. The constraint will still be enforced against subsequent inserts or updates (that is, they'll fail unless there is a matching row in the referenced table, in the case of foreign keys, or they'll fail unless the new row matches the specified check condition). But the database will not assume that the constraint holds for all rows in the table, until it is validated by using the VALIDATE CONSTRAINT option. See Notes below for more information about using the NOT VALID option.

Although most forms of ADD table_constraint require an ACCESS EXCLUSIVE lock, ADD FOREIGN KEY requires only a SHARE ROW EXCLUSIVE lock. Note that ADD FOREIGN KEY also acquires a SHARE ROW EXCLUSIVE lock on the referenced table, in addition to the lock on the table on which the constraint is declared.

Additional restrictions apply when unique or primary key constraints are added to partitioned tables; see CREATE TABLE. Also, foreign key constraints on partitioned tables may not be declared NOT VALID at present.`
  },
  { 
    label: "ALTER CONSTRAINT ${1:table_constraint} ${2|DEFERRABLE,NOT DEFERRABLE|} ${3|INITIALLY DEFERRED,INITIALLY IMMEDIATE|}", 
    docs: `This form alters the attributes of a constraint that was previously created. Currently only foreign key constraints may be altered.`
  },
  { 
    label: "VALIDATE CONSTRAINT ${1:table_constraint}", 
    docs: `This form validates a foreign key or check constraint that was previously created as NOT VALID, by scanning the table to ensure there are no rows for which the constraint is not satisfied. Nothing happens if the constraint is already marked valid. (See Notes below for an explanation of the usefulness of this command.)

This command acquires a SHARE UPDATE EXCLUSIVE lock.
    `
  },
  { 
    label: "DROP CONSTRAINT", 
    docs: `This form drops the specified constraint on a table, along with any index underlying the constraint. If IF EXISTS is specified and the constraint does not exist, no error is thrown. In this case a notice is issued instead.` 
  },

  ...[
    "DISABLE TRIGGER", 
    "ENABLE TRIGGER", 
    "ENABLE REPLICA TRIGGER" ,
    "ENABLE ALWAYS TRIGGER", 
  ].map(label => ({
    label,
    docs: `These forms configure the firing of trigger(s) belonging to the table. A disabled trigger is still known to the system, but is not executed when its triggering event occurs. For a deferred trigger, the enable status is checked when the event occurs, not when the trigger function is actually executed. One can disable or enable a single trigger specified by name, or all triggers on the table, or only user triggers (this option excludes internally generated constraint triggers such as those that are used to implement foreign key constraints or deferrable uniqueness and exclusion constraints). Disabling or enabling internally generated constraint triggers requires superuser privileges; it should be done with caution since of course the integrity of the constraint cannot be guaranteed if the triggers are not executed.

The trigger firing mechanism is also affected by the configuration variable session_replication_role. Simply enabled triggers (the default) will fire when the replication role is “origin” (the default) or “local”. Triggers configured as ENABLE REPLICA will only fire if the session is in “replica” mode, and triggers configured as ENABLE ALWAYS will fire regardless of the current replication role.

The effect of this mechanism is that in the default configuration, triggers do not fire on replicas. This is useful because if a trigger is used on the origin to propagate data between tables, then the replication system will also replicate the propagated data, and the trigger should not fire a second time on the replica, because that would lead to duplication. However, if a trigger is used for another purpose such as creating external alerts, then it might be appropriate to set it to ENABLE ALWAYS so that it is also fired on replicas.

This command acquires a SHARE ROW EXCLUSIVE lock.`
  })),

  ...[
    "DISABLE RULE $rewrite_rule_name;",
    "ENABLE RULE $rewrite_rule_name;", 
    "ENABLE REPLICA RULE ${1:rewrite_rule_name}",
    "ENABLE ALWAYS RULE ${1:rewrite_rule_name}"
  ].map(label => ({
    label,
    docs: `These forms configure the firing of rewrite rules belonging to the table. A disabled rule is still known to the system, but is not applied during query rewriting. The semantics are as for disabled/enabled triggers. This configuration is ignored for ON SELECT rules, which are always applied in order to keep views working even if the current session is in a non-default replication role.

The rule firing mechanism is also affected by the configuration variable session_replication_role, analogous to triggers as described above.`
  })),
  ...[
    "ENABLE ROW LEVEL SECURITY;", 
    "DISABLE ROW LEVEL SECURITY;",
    "FORCE ROW LEVEL SECURITY;", 
    "NO FORCE ROW LEVEL SECURITY;", 
  ].map(label => ({
    label,
    docs: `These forms control the application of row security policies belonging to the table. If enabled and no policies exist for the table, then a default-deny policy is applied. Note that policies can exist for a table even if row-level security is disabled. In this case, the policies will not be applied and the policies will be ignored. See also CREATE POLICY.`
  })),
  { 
    label: "CLUSTER ON index_name", 
    docs: `This form selects the default index for future CLUSTER operations. It does not actually re-cluster the table.

Changing cluster options acquires a SHARE UPDATE EXCLUSIVE lock.`
  },
  { 
    label: "SET WITHOUT CLUSTER", 
    docs: `This form removes the most recently used CLUSTER index specification from the table. This affects future cluster operations that don't specify an index.

Changing cluster options acquires a SHARE UPDATE EXCLUSIVE lock.`
  },
  { 
    label: "SET WITHOUT OIDS", 
    docs: `Backward-compatible syntax for removing the oid system column. As oid system columns cannot be added anymore, this never has an effect.`
  },
  { 
    label: "SET ACCESS METHOD ${1:new_access_method}", 
    docs: `This form changes the access method of the table by rewriting it`
  },
  { 
    label: "SET TABLESPACE ${1:new_tablespace}", 
    docs: `This form changes the table's tablespace to the specified tablespace and moves the data file(s) associated with the table to the new tablespace. Indexes on the table, if any, are not moved; but they can be moved separately with additional SET TABLESPACE commands. When applied to a partitioned table, nothing is moved, but any partitions created afterwards with CREATE TABLE PARTITION OF will use that tablespace, unless overridden by a TABLESPACE clause.

All tables in the current database in a tablespace can be moved by using the ALL IN TABLESPACE form, which will lock all tables to be moved first and then move each one. This form also supports OWNED BY, which will only move tables owned by the roles specified. If the NOWAIT option is specified then the command will fail if it is unable to acquire all of the locks required immediately. Note that system catalogs are not moved by this command; use ALTER DATABASE or explicit ALTER TABLE invocations instead if desired. The information_schema relations are not considered part of the system catalogs and will be moved. See also CREATE TABLESPACE.` 
  },
  { 
    label: "SET ${1|LOGGED,UNLOGGED|}", 
    docs: `This form changes the table from unlogged to logged or vice-versa (see UNLOGGED). It cannot be applied to a temporary table.

This also changes the persistence of any sequences linked to the table (for identity or serial columns). However, it is also possible to change the persistence of such sequences separately.` },
  { 
    label: "SET ( storage_parameter [= value] [, ... ] )", 
    docs: `This form changes one or more storage parameters for the table. See Storage Parameters in the CREATE TABLE documentation for details on the available parameters. Note that the table contents will not be modified immediately by this command; depending on the parameter you might need to rewrite the table to get the desired effects. That can be done with VACUUM FULL, CLUSTER or one of the forms of ALTER TABLE that forces a table rewrite. For planner related parameters, changes will take effect from the next time the table is locked so currently executing queries will not be affected.

SHARE UPDATE EXCLUSIVE lock will be taken for fillfactor, toast and autovacuum storage parameters, as well as the planner parameter parallel_workers.`
  },
  { 
    label: "RESET ( storage_parameter [, ... ] )", 
    docs: "This form resets one or more storage parameters to their defaults. As with SET, a table rewrite might be needed to update the table entirely." 
  },
  { 
    label: "INHERIT $parent_table", 
    docs: `This form adds the target table as a new child of the specified parent table. Subsequently, queries against the parent will include records of the target table. To be added as a child, the target table must already contain all the same columns as the parent (it could have additional columns, too). The columns must have matching data types, and if they have NOT NULL constraints in the parent then they must also have NOT NULL constraints in the child.

There must also be matching child-table constraints for all CHECK constraints of the parent, except those marked non-inheritable (that is, created with ALTER TABLE ... ADD CONSTRAINT ... NO INHERIT) in the parent, which are ignored; all child-table constraints matched must not be marked non-inheritable. Currently UNIQUE, PRIMARY KEY, and FOREIGN KEY constraints are not considered, but this might change in the future.` },
  { label: "NO INHERIT $parent_table", docs: "This form removes the target table from the list of children of the specified parent table. Queries against the parent table will no longer include records drawn from the target table. " },
  { label: "OF $type_name", docs: "This form links the table to a composite type as though CREATE TABLE OF had formed it. The table's list of column names and types must precisely match that of the composite type. The table must not inherit from any other table. These restrictions ensure that CREATE TABLE OF would permit an equivalent table definition." },
  { label: "NOT OF", docs: "This form dissociates a typed table from its type." },
  { label: "OWNER TO ${1|$new_owner,CURRENT_ROLE,CURRENT_USER,SESSION_USER|}", docs: "" },
  { label: "REPLICA IDENTITY ${1|DEFAULT,USING INDEX $index_name,FULL,NOTHING|}", docs: "" },
];


export const ALTER_COL_ACTIONS = [
  { 
    kwd: "SET DATA TYPE $data_type", 
    expects: "dataType", 
    docs: `This form changes the type of a column of a table. 
  
Indexes and simple table constraints involving the column will be automatically converted to use the new column type by reparsing the originally supplied expression. The optional COLLATE clause specifies a collation for the new column; if omitted, the collation is the default for the new column type. The optional USING clause specifies how to compute the new column value from the old; if omitted, the default conversion is the same as an assignment cast from old data type to new. A USING clause must be provided if there is no implicit or assignment cast from old to new type.

When this form is used, the column's statistics are removed, so running ANALYZE on the table afterwards is recommended.` },
  { kwd: "SET DEFAULT", 
    options: (ss, cb) => {
      const col = ss.find(s => cb.prevIdentifiers.includes(s.escapedIdentifier ?? "") && cb.prevIdentifiers.includes(s.escapedParentName ?? ""));
      const prioritisedFuncNames = ["now", "current_timestamp", `"current_user"`, "current_setting", "gen_random_uuid", "uuid_generate_v1", "uuid_generate_v4"];
      const funcs = ss.filter(s => {
        return !col || s.funcInfo?.restype_udt_name?.startsWith(col.colInfo?.udt_name ?? "invalid")
      }).map(s => ({
        ...s,
        sortText: prioritisedFuncNames.includes(s.name)? "!" : (s.sortText ?? s.name),
      }));
      return funcs;
    }, 
    docs: PG_COLUMN_CONSTRAINTS.find(d => d.kwd === "DEFAULT")?.docs },
  { kwd: "DROP DEFAULT", options: [{ label: ";" }], docs: PG_COLUMN_CONSTRAINTS.find(d => d.kwd === "DEFAULT")?.docs },
  { kwd: "SET NOT NULL", docs: PG_COLUMN_CONSTRAINTS.find(d => d.kwd === "NOT NULL")?.docs },
  { kwd: "DROP NOT NULL", docs: PG_COLUMN_CONSTRAINTS.find(d => d.kwd === "NOT NULL")?.docs },
  { kwd: "DROP EXPRESSION $1", docs: `This form turns a stored generated column into a normal base column. Existing data in the columns is retained, but future changes will no longer apply the generation expression.

If DROP EXPRESSION IF EXISTS is specified and the column is not a stored generated column, no error is thrown. In this case a notice is issued instead.
` },
  
  ...[
    "ADD GENERATED ${1|ALWAYS,BY DEFAULT|} AS IDENTITY ( sequence_options )",
    "DROP IDENTITY [ IF EXISTS ]", 
  ].map(kwd => ({
    kwd,
    docs: `These forms change whether a column is an identity column or change the generation attribute of an existing identity column. See CREATE TABLE for details. Like SET DEFAULT, these forms only affect the behavior of subsequent INSERT and UPDATE commands; they do not cause rows already in the table to change.

If DROP IDENTITY IF EXISTS is specified and the column is not an identity column, no error is thrown. In this case a notice is issued instead.`
  })),

  { 
    kwd: "SET STATISTICS $integer", 
    docs: `This form sets the per-column statistics-gathering target for subsequent ANALYZE operations. The target can be set in the range 0 to 10000; alternatively, set it to -1 to revert to using the system default statistics target (default_statistics_target). For more information on the use of statistics by the PostgreSQL query planner, refer to Section 14.2.

SET STATISTICS acquires a SHARE UPDATE EXCLUSIVE lock.`
  },
  ...[
    "SET ( attribute_option = value [, ... ] )" ,
    "RESET ( attribute_option [, ... ] )",  
  ].map(kwd => ({
    kwd,
    docs: `This form sets or resets per-attribute options. Currently, the only defined per-attribute options are n_distinct and n_distinct_inherited, which override the number-of-distinct-values estimates made by subsequent ANALYZE operations. n_distinct affects the statistics for the table itself, while n_distinct_inherited affects the statistics gathered for the table plus its inheritance children. When set to a positive value, ANALYZE will assume that the column contains exactly the specified number of distinct nonnull values. When set to a negative value, which must be greater than or equal to -1, ANALYZE will assume that the number of distinct nonnull values in the column is linear in the size of the table; the exact count is to be computed by multiplying the estimated table size by the absolute value of the given number. For example, a value of -1 implies that all values in the column are distinct, while a value of -0.5 implies that each value appears twice on the average. This can be useful when the size of the table changes over time, since the multiplication by the number of rows in the table is not performed until query planning time. Specify a value of 0 to revert to estimating the number of distinct values normally. For more information on the use of statistics by the PostgreSQL query planner, refer to Section 14.2.

Changing per-attribute options acquires a SHARE UPDATE EXCLUSIVE lock.`
  })),
  { 
    kwd: "SET STORAGE ${1|PLAIN,EXTERNAL,EXTENDED,MAIN|}", 
    options: [{ label: "PLAIN" }, { label: "EXTERNAL" }, { label: "EXTENDED" }, { label: "MAIN" }],
    docs: `This form sets the storage mode for a column. This controls whether this column is held inline or in a secondary TOAST table, and whether the data should be compressed or not. PLAIN must be used for fixed-length values such as integer and is inline, uncompressed. MAIN is for inline, compressible data. EXTERNAL is for external, uncompressed data, and EXTENDED is for external, compressed data. EXTENDED is the default for most data types that support non-PLAIN storage. Use of EXTERNAL will make substring operations on very large text and bytea values run faster, at the penalty of increased storage space. Note that SET STORAGE doesn't itself change anything in the table, it just sets the strategy to be pursued during future table updates. See Section 73.2 for more information.` },
  { 
    kwd: "SET COMPRESSION", 
    options: [{ label: "default" }, { label: "pglz" }, { label: "lz4" }],
    docs: `This form sets the compression method for a column, determining how values inserted in future will be compressed (if the storage mode permits compression at all). This does not cause the table to be rewritten, so existing data may still be compressed with other compression methods. If the table is restored with pg_restore, then all values are rewritten with the configured compression method. However, when data is inserted from another relation (for example, by INSERT ... SELECT), values from the source table are not necessarily detoasted, so any previously compressed data may retain its existing compression method, rather than being recompressed with the compression method of the target column. The supported compression methods are pglz and lz4. (lz4 is available only if --with-lz4 was used when building PostgreSQL.) In addition, compression_method can be default, which selects the default behavior of consulting the default_toast_compression setting at the time of data insertion to determine the method to use.` 
  },
] satisfies readonly KWD[];



const commonTableNames = [
  "users", 
  "products", 
  "sessions", 
  "orders", 
  "bookings", 
  "locations", 
  "customers",
  "subscriptions",
  "plans",
  "refunds",
  "payments",
  "transactions",
  "logs",
  "files",
  "chats",
  "messages",
  "notifications",
  "events",
] as const; 

export const getNewColumnDefinitions = (ss: ParsedSQLSuggestion[]) => {

  const getRefCols = (tName: string | undefined, colDataType: string) => {
    if(tName?.includes("user") || tName?.includes("customer")){

      return ["created", "updated", "deleted", "changed", "viewed", "approved", "signed", "requested", "reviewed", "assigned"].flatMap(action => {
        return {
          label: `${action}_by ${colDataType} NOT NULL REFERENCES ${tName}`,
          docs: "",
        }
      })
    }

    return []
  }

  const cols = [
    ...commonTableNames.flatMap(tableName => ["INTEGER", "BIGINT", "UUID"]
      .flatMap(dataType => {
        const idRef = { 
          label: `${tableName.slice(0, -1)}_id  ${dataType}  REFERENCES ${tableName}`,
          docs: ""
        };
        return getRefCols(tableName, dataType).concat([idRef]);
    })),
    { label: "username TEXT NOT NULL", docs: "" },
    { label: "username  VARCHAR(50) UNIQUE NOT NULL", docs: "" },
    { label: "first_name  VARCHAR(150) NOT NULL", docs: "" },
    { label: "last_name  VARCHAR(150) NOT NULL", docs: "" },
    { label: `age  INTEGER \n CONSTRAINT "is greater than 0"\n CHECK(age > 0)`, docs: "" },
    { label: "birthdate DATE NOT NULL CHECK(birthdate < now())", docs: "" },
    { label: "dob  DATE NOT NULL CHECK(dob < now())", docs: "" },
    { label: "date_of_birth  DATE NOT NULL CHECK(date_of_birth < now())", docs: "" },
    { label: "password  VARCHAR(50) NOT NULL", docs: "" },
    { label: `address_line1  VARCHAR(250)`, docs: "" },
    { label: `address_line2  VARCHAR(250)`, docs: "" },
    { label: "postcode  VARCHAR(20) NOT NULL", docs: "" },
    { label: "status  VARCHAR(50)", docs: "" },
    { label: "phone  VARCHAR(50) NOT NULL", docs: "" },
    { label: "country  VARCHAR(50) NOT NULL", docs: "" },
    { label: "city  VARCHAR(150) NOT NULL", docs: "" },
    { label: "organization  VARCHAR(150) NOT NULL", docs: "" },
    { label: "zip_code  VARCHAR(20) NOT NULL", docs: "" },
    { label: `email  VARCHAR(255) NOT NULL UNIQUE \n CONSTRAINT "prevent case and whitespace duplicates"\n CHECK (email = trim(lower(email)))`, docs: "" },
    ...[
      "created_on",
      "starts_at",
      "ends_at",
      "start",
      "end",
      "created_at",
      "added_at",
      "updated",
      "updated_at",
      "deleted",
      "deleted_at",
    ].map(colName => ({ label: `${colName} TIMESTAMP NOT NULL DEFAULT now()`, docs: ""})), 
    { label: "last_login TIMESTAMP", docs: "" },
    { label: "order_timestamp NOT NULL TIMESTAMP", docs: "" },
    { label: "quantity INTEGER NOT NULL CHECK(quantity > 1)", docs: "" },
    { label: "notes  VARCHAR(200)", docs: "" },
    { label: "id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY", docs: "Cannot be updated" },
    { label: "id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY", docs: "Cannot be updated" },
    { label: "id  SERIAL PRIMARY KEY", docs: "" },
    { label: "id  BIGSERIAL PRIMARY KEY", docs: "" },
    { label: "id  UUID PRIMARY KEY DEFAULT gen_random_uuid()", docs: "" },
    { label: "id  UUID PRIMARY KEY DEFAULT uuid_generate_v1()", docs: "" },
    { label: "id  INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY", docs: "" },
    { label: "name  VARCHAR(150) NOT NULL", docs: "" },
    { label: "type  VARCHAR(150) NOT NULL", docs: "" },
    { label: "url  TEXT", docs: "" },
    { label: "description  VARCHAR(250)", docs: "" },
    { label: "title  VARCHAR(250)", docs: "" },
    { label: "label  VARCHAR(250)", docs: "" },
    { label: "message  VARCHAR(450) NOT NULL", docs: "" },
    { label: "price  DECIMAL(12,2) CHECK(price >= 0)", docs: "" },

    { label: "geom GEOMETRY", docs: "" },
    { label: "geog GEOGRAPHY", docs: "" },

    ...(["GEOMETRY", "GEOGRAPHY"].flatMap(type => [
      { label: `location ${type}(point, 4326)`, docs: "" },  
      { label: `latlong  ${type}(point, 4326)`,   docs: "" },
      { label: `route  ${type}(linestring, 4326)`,  docs: "" }, 
      { label: `path ${type}(linestring, 4326)`,   docs: "" },
      { label: `line ${type}(linestring, 4326)`,   docs: "" },
      { label: `track ${type}(linestring, 4326)`,  docs: "" }, 
      { label: `geo${type[3]!.toLowerCase()} ${type}(linestring, 4326)`,   docs: "" },
      { label: `geo${type[3]!.toLowerCase()} ${type}(polygon, 4326)`,   docs: "" },
      { label: `geo${type[3]!.toLowerCase()} ${type}(point, 4326)`,   docs: "" },
    ])),  

    { label: "preferences JSONB default '{}'",   docs: "" },
    { label: "description  VARCHAR(450)", docs: "" },
  ]

  const refCols = ss
    .filter(s => s.type === "table" && !["prostgles", "pg_catalog", "information_schema"].includes(s.schema!)  )
    .flatMap(t => {
      const tableNamePref = t.escapedIdentifier!.endsWith("s")? t.escapedIdentifier?.slice(0, -1) : t.escapedIdentifier!;
      /** Is unique/pkey */
      return t.cols?.filter(c => ["u", "p"].some(cns => c.cConstraint?.contype === cns))
        .flatMap(c => {
          const colDataType = c.data_type.toUpperCase();
          const newColName =  JSON.stringify(`${(tableNamePref?.endsWith('"')? tableNamePref.slice(1, -1) : tableNamePref)}_${c.name}`);
          const idRef = { 
            docs: "", 
            label: `${newColName} ${colDataType} NOT NULL REFERENCES ${t.escapedIdentifier}` 
          }

          return getRefCols(t.escapedIdentifier, colDataType).concat([idRef]);
        });
    }).filter(isDefined);

  return [
    ...cols.filter(c => !c.label.includes("REFERENCES ")),// || !refCols.some(rc => rc.label.split(" ")[0] === c.label.split(" ")[0])),
    ...refCols
  ].map(v => pickKeys(v, ["label"]));
}