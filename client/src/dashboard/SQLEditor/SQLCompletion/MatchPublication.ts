import { getParentFunction } from "./MatchSelect";
import { getExpected } from "./getExpected";
import type { SQLMatcher } from "./registerSuggestions";
import type { KWD } from "./withKWDs";
import { withKWDs } from "./withKWDs";

export const MatchPublication: SQLMatcher = {
  match: (cb) => cb.tokens[1]?.textLC === "publication",
  result: async ({ cb, ss, setS, sql }) => {
    const command = cb.ftoken?.textLC;
    const newPubName =
      command === "create" &&
      cb.tokens[1]?.textLC === "publication" &&
      cb.tokens[2];

    const isInfunc = getParentFunction(cb);
    if (isInfunc?.func.textLC === "with") {
      return withKWDs(
        [
          {
            kwd: "publish='insert, update, delete, truncate'",
            options: [``],
            docs: `This parameter determines which DML operations will be published by the new publication to the subscribers. The value is comma-separated list of operations. The allowed operations are insert, update, delete, and truncate. The default is to publish all actions, and so the default value for this option is 'insert, update, delete, truncate'.`,
          },
          {
            kwd: "publish_via_partition_root=true",
            options: [``],
            docs: `This parameter determines whether changes in a partitioned table (or on its partitions) contained in the publication will be published using the identity and schema of the partitioned table rather than that of the individual partitions that are actually changed; the latter is the default. Enabling this allows the changes to be replicated into a non-partitioned table or a partitioned table consisting of a different set of partitions.\nIf this is enabled, TRUNCATE operations performed directly on partitions are not replicated.`,
          },
        ],
        { cb, ss, setS, sql },
      ).getSuggestion(",", ["(", ")"]);
    }

    if (newPubName) {
      return withKWDs(
        [
          ...Object.entries(options).map(
            ([kwd, { docs, expects, optional }]) => ({
              kwd,
              docs,
              expects,
              optional,
            }),
          ),
        ] satisfies KWD[],
        { cb, ss, setS, sql },
      ).getSuggestion();
    }

    if (cb.prevLC.endsWith("if exists")) {
      return getExpected("publication", cb, ss);
    }

    return withKWDs(
      [
        {
          kwd: "PUBLICATION",
          expects: command === "create" ? undefined : "publication",
          excludeIf: (cb) => cb.l1token?.textLC === "publication",
          options:
            command === "drop" ? [{ label: "IF EXISTS" }]
            : command === "create" ? [{ label: "$new_publication_name" }]
            : undefined,
          docs: "Adds a new publication into the current database. The publication name must be distinct from the name of any existing publication in the current database. A publication is essentially a group of tables whose data changes are intended to be replicated through logical replication.",
        },
      ] satisfies KWD[],
      { cb, ss, setS, sql },
    ).getSuggestion();
  },
};

const options = {
  "FOR TABLE": {
    docs: `Specifies a list of tables to add to the publication. If ONLY is specified before the table name, only that table is added to the publication. If ONLY is not specified, the table and all its descendant tables (if any) are added. Optionally, * can be specified after the table name to explicitly indicate that descendant tables are included. This does not apply to a partitioned table, however. The partitions of a partitioned table are always implicitly considered part of the publication, so they are never explicitly added to the publication.

If the optional WHERE clause is specified, it defines a row filter expression. Rows for which the expression evaluates to false or null will not be published. Note that parentheses are required around the expression. It has no effect on TRUNCATE commands.

When a column list is specified, only the named columns are replicated. If no column list is specified, all columns of the table are replicated through this publication, including any columns added later. It has no effect on TRUNCATE commands. See Section 31.4 for details about column lists.

Only persistent base tables and partitioned tables can be part of a publication. Temporary tables, unlogged tables, foreign tables, materialized views, and regular views cannot be part of a publication.

Specifying a column list when the publication also publishes FOR TABLES IN SCHEMA is not supported.

When a partitioned table is added to a publication, all of its existing and future partitions are implicitly considered to be part of the publication. So, even operations that are performed directly on a partition are also published via publications that its ancestors are part of.`,
    expects: "table",
    optional: false,
  },
  "FOR ALL TABLES": {
    docs: `Marks the publication as one that replicates changes for all tables in the database, including tables created in the future.`,
    expects: undefined,
    optional: false,
  },
  "FOR TABLES IN SCHEMA": {
    docs: `Marks the publication as one that replicates changes for all tables in the specified list of schemas, including tables created in the future.

Specifying a schema when the publication also publishes a table with a column list is not supported.

Only persistent base tables and partitioned tables present in the schema will be included as part of the publication. Temporary tables, unlogged tables, foreign tables, materialized views, and regular views from the schema will not be part of the publication.

When a partitioned table is published via schema level publication, all of its existing and future partitions are implicitly considered to be part of the publication, regardless of whether they are from the publication schema or not. So, even operations that are performed directly on a partition are also published via publications that its ancestors are part of.`,
    expects: "schema",
    optional: false,
  },
  WITH: {
    optional: true,
    docs: `This clause specifies optional parameters for a publication. The following parameters are supported:

publish (string) 
This parameter determines which DML operations will be published by the new publication to the subscribers. The value is comma-separated list of operations. The allowed operations are insert, update, delete, and truncate. The default is to publish all actions, and so the default value for this option is 'insert, update, delete, truncate'.

This parameter only affects DML operations. In particular, the initial data synchronization (see Section 31.7.1) for logical replication does not take this parameter into account when copying existing table data.

publish_via_partition_root (boolean) 
This parameter determines whether changes in a partitioned table (or on its partitions) contained in the publication will be published using the identity and schema of the partitioned table rather than that of the individual partitions that are actually changed; the latter is the default. Enabling this allows the changes to be replicated into a non-partitioned table or a partitioned table consisting of a different set of partitions.

There can be a case where a subscription combines multiple publications. If a partitioned table is published by any subscribed publications which set publish_via_partition_root = true, changes on this partitioned table (or on its partitions) will be published using the identity and schema of this partitioned table rather than that of the individual partitions.

This parameter also affects how row filters and column lists are chosen for partitions; see below for details.

If this is enabled, TRUNCATE operations performed directly on partitions are not replicated.

When specifying a parameter of type boolean, the = value part can be omitted, which is equivalent to specifying TRUE.`,
    expects: undefined,
  },
} as const;
