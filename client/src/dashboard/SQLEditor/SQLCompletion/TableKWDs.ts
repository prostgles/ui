import { isDefined, pickKeys } from "prostgles-types";
import { asSQL } from "./KEYWORDS";
import type { ParsedSQLSuggestion } from "./registerSuggestions";
import type { KWD } from "./withKWDs";

export const PG_COLUMN_CONSTRAINTS = [
  {
    kwd: "GENERATED",
    options: [
      {
        label: "BY DEFAULT AS IDENTITY",
        docs: `Instructs PostgreSQL to generate a value for the identity column. However, if you supply a value for insert or update, PostgreSQL will use that value to insert into the identity column instead of using the system-generated value.`,
      },
      {
        label: "ALWAYS AS IDENTITY",
        docs: `Instructs PostgreSQL to always generate a value for the identity column. If you attempt to insert (or update) values into the GENERATED ALWAYS AS IDENTITY column, PostgreSQL will issue an error.`,
      },
      {
        label: "ALWAYS AS ($0 ) STORED",
        docs:
          `A stored generated column is computed when it is written (inserted or updated) and occupies storage as if it were a normal column\n\n` +
          asSQL(
            [
              `CREATE TABLE people (`,
              `   ...,`,
              `   height_cm numeric,`,
              `   height_in numeric GENERATED ALWAYS AS (height_cm / 2.54) STORED`,
              `);`,
            ].join("\n"),
          ),
      },
    ],
    docs: `A generated column is a special column that is always computed from other columns. Thus, it is for columns what a view is for tables. There are two kinds of generated columns: stored and virtual. A stored generated column is computed when it is written (inserted or updated) and occupies storage as if it were a normal column. A virtual generated column occupies no storage and is computed when it is read. Thus, a virtual generated column is similar to a view and a stored generated column is similar to a materialized view (except that it is always updated automatically). PostgreSQL currently implements only stored generated columns.`,
  },
  {
    kwd: "NOT NULL",
    docs: "Constraint ensuring this column cannot be NULL. By default columns can have NULL values if no constraints are specified.",
  },
  {
    kwd: "REFERENCES",
    expects: "table",
    docs:
      "A foreign key constraint specifies that the values in a column (or a group of columns) must match the values appearing in some row of another table. We say this maintains the referential integrity between two related tables. The referenced column/s must be unique.\nhttps://www.postgresql.org/docs/current/tutorial-fk.html\n\n" +
      asSQL("product_id INTEGER REFERENCES products (id) "),
  },
  {
    kwd: "PRIMARY KEY",
    docs: "A primary key constraint indicates that a column, or group of columns, can be used as a unique identifier for rows in the table. This requires that the values be both unique and not null.",
  },
  {
    kwd: "DEFAULT",
    expects: "function",
    docs:
      "A column can be assigned a default value. When a new row is created and no values are specified for some of the columns, those columns will be filled with their respective default values. If no default value is declared explicitly, the default value is the null value. \n" +
      asSQL("/* For example */\ncreated_at TIMESTAMP DEFAULT now()"),
  },
  {
    kwd: "CHECK",
    expects: "(condition)",
    docs:
      "Specify that the value in a certain column must satisfy a Boolean (truth-value) expression. For instance, to require positive product prices, you could use: \n" +
      asSQL(`CHECK (price > 0)`),
  },
  {
    kwd: "UNIQUE",
    expects: "(column)",
    docs: "The UNIQUE constraint specifies that a group of one or more columns of a table can contain only unique values. For the purpose of a unique constraint, null values are not considered equal, unless NULLS NOT DISTINCT is specified.Adding a unique constraint will automatically create a unique btree index on the column or group of columns used in the constraint.",
  },
] as const satisfies readonly KWD[];

/** Used in ADD CONSTRAINT. These exclude constraints that target single columns only. */
export const PG_TABLE_CONSTRAINTS = [
  {
    kwd: "FOREIGN KEY",
    expects: "(column)",
    docs: PG_COLUMN_CONSTRAINTS.find((c) => c.kwd === "REFERENCES")!.docs,
  },
  {
    kwd: "PRIMARY KEY",
    expects: "(column)",
    docs: PG_COLUMN_CONSTRAINTS.find((c) => c.kwd === "PRIMARY KEY")!.docs,
  },
  ...PG_COLUMN_CONSTRAINTS.filter(
    (c) =>
      !(["REFERENCES", "DEFAULT", "NOT NULL", "PRIMARY KEY"] as const).some(
        (v) => v === c.kwd,
      ),
  ),
] as const satisfies readonly KWD[];

export const REFERENCES_COL_OPTS = [
  {
    kwd: "ON DELETE CASCADE",
    docs: "When a referenced row is deleted, row(s) referencing it should be automatically deleted as well",
  },
  {
    kwd: "ON DELETE SET NULL",
    docs: "When a referenced row is deleted referencing column(s) in the referencing row(s) to be set to NULL",
  },
  {
    kwd: "ON DELETE SET DEFAULT",
    docs: "When a referenced row is deleted referencing column(s) in the referencing row(s) to be set to their DEFAULT values",
  },
  { kwd: "ON DELETE RESTRICT", docs: "Prevents deletion of a referenced row" },
  {
    kwd: "ON DELETE NO ACTION",
    docs: "If any referencing rows still exist when the constraint is checked, an error is raised; this is the default behavior if you do not specify anything",
  },
  {
    kwd: "ON UPDATE CASCADE",
    docs: "When a referenced row is updated referencing column(s) in the referencing row(s) should be automatically updated as well",
  },
  {
    kwd: "ON UPDATE SET NULL",
    docs: "When a referenced row is updated referencing column(s) in the referencing row(s) should be automatically set to NULL",
  },
  {
    kwd: "ON UPDATE SET DEFAULT",
    docs: "When a referenced row is updated referencing column(s) in the referencing row(s) should be automatically set to their DEFAULT values",
  },
  { kwd: "ON UPDATE RESTRICT", docs: "Prevents updating a referenced row" },
  {
    kwd: "ON UPDATE NO ACTION",
    docs: "If any referencing rows still exist when the constraint is checked, an error is raised; this is the default behavior if you do not specify anything",
  },
] as const;

const REF_OPTS = [
  {
    label: "CASCADE",
    getInfo: (a?: "DELETE" | "UPDATE") => {
      const d = "DELETE any rows referencing the deleted row";
      const u =
        "UPDATE the values of the referencing column(s) to the new values of the referenced columns";
      if (!a) return [d, u].join(" OR ");
      if (a === "DELETE") {
        return d;
      }
      return u;
    },
  },
  {
    label: "SET NULL",
    getInfo: (a?: "DELETE" | "UPDATE") =>
      "Set the referencing column(s) to null",
  },
  {
    label: "RESTRICT",
    getInfo: (a?: "DELETE" | "UPDATE") =>
      "Produce an error indicating that the deletion or update would create a foreign key constraint violation. This is the same as NO ACTION except that the check is not deferrable.",
  },
  {
    label: "SET DEFAULT",
    getInfo: (a?: "DELETE" | "UPDATE") =>
      "Set the referencing column(s) to their default values. (There must be a row in the referenced table matching the default values, if they are not null, or the operation will fail.)",
  },
] as const;

export const REFERENCE_CONSTRAINT_OPTIONS_KWDS = [
  {
    kwd: "ON DELETE",
    docs: `When the data in the referenced columns is deleted: `,
    options: REF_OPTS.map((d) => ({
      label: d.label,
      docs: d.getInfo("DELETE"),
    })),
    dependsOn: "REFERENCES",
  },
  {
    kwd: "ON UPDATE",
    docs: `When the data in the referenced columns is updated: `,
    options: REF_OPTS.map((d) => ({
      label: d.label,
      docs: d.getInfo("UPDATE"),
    })),
    dependsOn: "REFERENCES",
  },
] as const satisfies readonly KWD[];

export const TABLE_CONS_TYPES = PG_TABLE_CONSTRAINTS.map((c) => c.kwd);

export const ALTER_COL_ACTIONS = [
  {
    kwd: "SET DATA TYPE $data_type",
    expects: "dataType",
    docs: `This form changes the type of a column of a table. 
  
Indexes and simple table constraints involving the column will be automatically converted to use the new column type by reparsing the originally supplied expression. The optional COLLATE clause specifies a collation for the new column; if omitted, the collation is the default for the new column type. The optional USING clause specifies how to compute the new column value from the old; if omitted, the default conversion is the same as an assignment cast from old data type to new. A USING clause must be provided if there is no implicit or assignment cast from old to new type.

When this form is used, the column's statistics are removed, so running ANALYZE on the table afterwards is recommended.`,
  },
  {
    kwd: "SET DEFAULT",
    options: (ss, cb) => {
      const col = ss.find(
        (s) =>
          cb.prevIdentifiers.some((pi) => pi.text === s.escapedIdentifier) &&
          cb.prevIdentifiers.some((pi) => pi.text === s.escapedParentName),
      );
      const prioritisedFuncNames = [
        "now",
        "current_timestamp",
        `"current_user"`,
        "current_setting",
        "gen_random_uuid",
        "uuid_generate_v1",
        "uuid_generate_v4",
      ];
      const funcs = ss
        .filter((s) => {
          return (
            !col ||
            (s.funcInfo?.restype_udt_name?.startsWith(
              col.colInfo?.udt_name ?? "invalid",
            ) &&
              !s.funcInfo.args.length)
          );
        })
        .map((s) => ({
          ...s,
          sortText:
            prioritisedFuncNames.includes(s.name) ? "!" : (
              (s.sortText ?? s.name)
            ),
        }));
      return [...funcs];
    },
    docs: PG_COLUMN_CONSTRAINTS.find((d) => d.kwd === "DEFAULT")?.docs,
  },
  {
    kwd: "DROP DEFAULT",
    options: [{ label: ";" }],
    docs: PG_COLUMN_CONSTRAINTS.find((d) => d.kwd === "DEFAULT")?.docs,
  },
  {
    kwd: "SET NOT NULL",
    docs: PG_COLUMN_CONSTRAINTS.find((d) => d.kwd === "NOT NULL")?.docs,
  },
  {
    kwd: "DROP NOT NULL",
    docs: PG_COLUMN_CONSTRAINTS.find((d) => d.kwd === "NOT NULL")?.docs,
  },
  {
    kwd: "DROP EXPRESSION $1",
    docs: `This form turns a stored generated column into a normal base column. Existing data in the columns is retained, but future changes will no longer apply the generation expression.

If DROP EXPRESSION IF EXISTS is specified and the column is not a stored generated column, no error is thrown. In this case a notice is issued instead.
`,
  },

  ...[
    "ADD GENERATED ${1|ALWAYS,BY DEFAULT|} AS IDENTITY ( sequence_options )",
    "DROP IDENTITY [ IF EXISTS ]",
  ].map((kwd) => ({
    kwd,
    docs: `These forms change whether a column is an identity column or change the generation attribute of an existing identity column. See CREATE TABLE for details. Like SET DEFAULT, these forms only affect the behavior of subsequent INSERT and UPDATE commands; they do not cause rows already in the table to change.

If DROP IDENTITY IF EXISTS is specified and the column is not an identity column, no error is thrown. In this case a notice is issued instead.`,
  })),

  {
    kwd: "SET STATISTICS $integer",
    docs: `This form sets the per-column statistics-gathering target for subsequent ANALYZE operations. The target can be set in the range 0 to 10000; alternatively, set it to -1 to revert to using the system default statistics target (default_statistics_target). For more information on the use of statistics by the PostgreSQL query planner, refer to Section 14.2.

SET STATISTICS acquires a SHARE UPDATE EXCLUSIVE lock.`,
  },
  ...[
    "SET ( attribute_option = value [, ... ] )",
    "RESET ( attribute_option [, ... ] )",
  ].map((kwd) => ({
    kwd,
    docs: `This form sets or resets per-attribute options. Currently, the only defined per-attribute options are n_distinct and n_distinct_inherited, which override the number-of-distinct-values estimates made by subsequent ANALYZE operations. n_distinct affects the statistics for the table itself, while n_distinct_inherited affects the statistics gathered for the table plus its inheritance children. When set to a positive value, ANALYZE will assume that the column contains exactly the specified number of distinct nonnull values. When set to a negative value, which must be greater than or equal to -1, ANALYZE will assume that the number of distinct nonnull values in the column is linear in the size of the table; the exact count is to be computed by multiplying the estimated table size by the absolute value of the given number. For example, a value of -1 implies that all values in the column are distinct, while a value of -0.5 implies that each value appears twice on the average. This can be useful when the size of the table changes over time, since the multiplication by the number of rows in the table is not performed until query planning time. Specify a value of 0 to revert to estimating the number of distinct values normally. For more information on the use of statistics by the PostgreSQL query planner, refer to Section 14.2.

Changing per-attribute options acquires a SHARE UPDATE EXCLUSIVE lock.`,
  })),
  {
    kwd: "SET STORAGE ${1|PLAIN,EXTERNAL,EXTENDED,MAIN|}",
    options: [
      { label: "PLAIN" },
      { label: "EXTERNAL" },
      { label: "EXTENDED" },
      { label: "MAIN" },
    ],
    docs: `This form sets the storage mode for a column. This controls whether this column is held inline or in a secondary TOAST table, and whether the data should be compressed or not. PLAIN must be used for fixed-length values such as integer and is inline, uncompressed. MAIN is for inline, compressible data. EXTERNAL is for external, uncompressed data, and EXTENDED is for external, compressed data. EXTENDED is the default for most data types that support non-PLAIN storage. Use of EXTERNAL will make substring operations on very large text and bytea values run faster, at the penalty of increased storage space. Note that SET STORAGE doesn't itself change anything in the table, it just sets the strategy to be pursued during future table updates. See Section 73.2 for more information.`,
  },
  {
    kwd: "SET COMPRESSION",
    options: [{ label: "default" }, { label: "pglz" }, { label: "lz4" }],
    docs: `This form sets the compression method for a column, determining how values inserted in future will be compressed (if the storage mode permits compression at all). This does not cause the table to be rewritten, so existing data may still be compressed with other compression methods. If the table is restored with pg_restore, then all values are rewritten with the configured compression method. However, when data is inserted from another relation (for example, by INSERT ... SELECT), values from the source table are not necessarily detoasted, so any previously compressed data may retain its existing compression method, rather than being recompressed with the compression method of the target column. The supported compression methods are pglz and lz4. (lz4 is available only if --with-lz4 was used when building PostgreSQL.) In addition, compression_method can be default, which selects the default behavior of consulting the default_toast_compression setting at the time of data insertion to determine the method to use.`,
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
    if (tName?.includes("user") || tName?.includes("customer")) {
      return [
        "created",
        "updated",
        "deleted",
        "changed",
        "viewed",
        "approved",
        "signed",
        "requested",
        "reviewed",
        "assigned",
      ].flatMap((action) => {
        return {
          label: `${action}_by ${colDataType} NOT NULL REFERENCES ${tName}`,
          docs: "",
        };
      });
    }

    return [];
  };

  const cols = [
    ...commonTableNames.flatMap((tableName) =>
      ["INTEGER", "BIGINT", "UUID"].flatMap((dataType) => {
        const idRef = {
          label: `${tableName.slice(0, -1)}_id  ${dataType}  REFERENCES ${tableName}`,
          docs: "",
        };
        return getRefCols(tableName, dataType).concat([idRef]);
      }),
    ),
    { label: "username TEXT NOT NULL", docs: "" },
    { label: "username  VARCHAR(50) UNIQUE NOT NULL", docs: "" },
    { label: "first_name  VARCHAR(150) NOT NULL", docs: "" },
    { label: "last_name  VARCHAR(150) NOT NULL", docs: "" },
    {
      label: `age  INTEGER \n CONSTRAINT "is greater than 0"\n CHECK(age > 0)`,
      docs: "",
    },
    { label: "birthdate DATE NOT NULL CHECK(birthdate < now())", docs: "" },
    { label: "dob  DATE NOT NULL CHECK(dob < now())", docs: "" },
    {
      label: "date_of_birth  DATE NOT NULL CHECK(date_of_birth < now())",
      docs: "",
    },
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
    {
      label: `email  VARCHAR(255) NOT NULL UNIQUE \n CONSTRAINT "prevent case and whitespace duplicates"\n CHECK (email = trim(lower(email)))`,
      docs: "",
    },
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
    ].map((colName) => ({
      label: `${colName} TIMESTAMP NOT NULL DEFAULT now()`,
      docs: "",
    })),
    { label: "last_login TIMESTAMP", docs: "" },
    { label: "order_timestamp NOT NULL TIMESTAMP", docs: "" },
    { label: "quantity INTEGER NOT NULL CHECK(quantity > 1)", docs: "" },
    { label: "notes  VARCHAR(200)", docs: "" },
    {
      label: "id  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY",
      docs: "Cannot be updated",
    },
    {
      label: "id  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY",
      docs: "Cannot be updated",
    },
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

    ...["GEOMETRY", "GEOGRAPHY"].flatMap((type) => [
      { label: `location ${type}(point, 4326)`, docs: "" },
      { label: `latlong  ${type}(point, 4326)`, docs: "" },
      { label: `route  ${type}(linestring, 4326)`, docs: "" },
      { label: `path ${type}(linestring, 4326)`, docs: "" },
      { label: `line ${type}(linestring, 4326)`, docs: "" },
      { label: `track ${type}(linestring, 4326)`, docs: "" },
      {
        label: `geo${type[3]!.toLowerCase()} ${type}(linestring, 4326)`,
        docs: "",
      },
      {
        label: `geo${type[3]!.toLowerCase()} ${type}(polygon, 4326)`,
        docs: "",
      },
      { label: `geo${type[3]!.toLowerCase()} ${type}(point, 4326)`, docs: "" },
    ]),

    { label: "preferences JSONB default '{}'", docs: "" },
    { label: "description  VARCHAR(450)", docs: "" },
  ];

  const refCols = ss
    .filter(
      (s) =>
        s.type === "table" &&
        !["prostgles", "pg_catalog", "information_schema"].includes(s.schema!),
    )
    .flatMap((t) => {
      const tableNamePref =
        t.escapedIdentifier!.endsWith("s") ?
          t.escapedIdentifier?.slice(0, -1)
        : t.escapedIdentifier!;
      /** Is unique/pkey */
      return t.cols
        ?.filter((c) =>
          ["u", "p"].some((cns) => c.cConstraint?.contype === cns),
        )
        .flatMap((c) => {
          const colDataType = c.data_type.toUpperCase();
          const newColName = JSON.stringify(
            `${tableNamePref?.endsWith('"') ? tableNamePref.slice(1, -1) : tableNamePref}_${c.name}`,
          );
          const idRef = {
            docs: "",
            label: `${newColName} ${colDataType} NOT NULL REFERENCES ${t.escapedIdentifier}`,
          };

          return getRefCols(t.escapedIdentifier, colDataType).concat([idRef]);
        });
    })
    .filter(isDefined);

  return [
    ...cols.filter((c) => !c.label.includes("REFERENCES ")), // || !refCols.some(rc => rc.label.split(" ")[0] === c.label.split(" ")[0])),
    ...refCols,
  ].map((v) => pickKeys(v, ["label"]));
};
