import { getParentFunction } from "./MatchSelect";
import { getExpected } from "./getExpected";
import type { SQLMatcher } from "./registerSuggestions";
import type { KWD } from "./withKWDs";
import { withKWDs } from "./withKWDs";

export const MatchSubscription: SQLMatcher = {
  match: (cb) => cb.tokens[1]?.textLC === "subscription",
  result: async ({ cb, ss, setS, sql }) => {
    const command = cb.ftoken?.textLC;
    const newSubscriptionName =
      command === "create" &&
      cb.tokens[1]?.textLC === "subscription" &&
      cb.tokens[2];

    const isInfunc = getParentFunction(cb);
    if (isInfunc?.func.textLC === "with") {
      return withKWDs(
        Object.entries(withOptions).map(([kwd, { docs, options }]) => ({
          kwd,
          docs,
          options,
        })),
        { cb, ss, setS, sql },
      ).getSuggestion(",", ["(", ")"]);
    }

    if (newSubscriptionName) {
      return withKWDs(
        [
          {
            kwd: "CONNECTION",
            docs: `The libpq connection string defining how to connect to the publisher database`,
            options: [
              "'host=192.168.1.50 port=5432 user=foo dbname=foodb password=mypassword'",
            ],
          },
          {
            kwd: "PUBLICATION",
            docs: `Names of the publications on the publisher to subscribe to.`,
            options: ["$publication_name"],
          },
          {
            kwd: "WITH",
            optional: true,
            docs: `Optional parameters for a subscription`,
          },
        ] satisfies KWD[],
        { cb, ss, setS, sql },
      ).getSuggestion();
    }

    if (cb.prevLC.endsWith("if exists")) {
      return getExpected("subscription", cb, ss);
    }

    return withKWDs(
      [
        {
          kwd: "SUBSCRIPTION",
          expects: command === "create" ? undefined : "subscription",
          excludeIf: (cb) => cb.l1token?.textLC === "subscription",
          options:
            command === "drop" ? [{ label: "IF EXISTS" }]
            : command === "create" ? [{ label: "$new_subscription_name" }]
            : undefined,
          docs: "Adds a new logical-replication subscription. The user that creates a subscription becomes the owner of the subscription. The subscription name must be distinct from the name of any existing subscription in the current database.",
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
  },
  "FOR ALL TABLES": {
    docs: `Marks the publication as one that replicates changes for all tables in the database, including tables created in the future.`,
    expects: undefined,
  },
  "FOR TABLES IN SCHEMA": {
    docs: `Marks the publication as one that replicates changes for all tables in the specified list of schemas, including tables created in the future.

Specifying a schema when the publication also publishes a table with a column list is not supported.

Only persistent base tables and partitioned tables present in the schema will be included as part of the publication. Temporary tables, unlogged tables, foreign tables, materialized views, and regular views from the schema will not be part of the publication.

When a partitioned table is published via schema level publication, all of its existing and future partitions are implicitly considered to be part of the publication, regardless of whether they are from the publication schema or not. So, even operations that are performed directly on a partition are also published via publications that its ancestors are part of.`,
    expects: "schema",
  },
  WITH: {
    docs: `This clause specifies optional parameters for a subscription`,
    expects: undefined,
  },
} as const;

const withOptions = {
  connect: {
    options: ["=true", "=false"],
    docs: `(boolean) 
Specifies whether the CREATE SUBSCRIPTION command should connect to the publisher at all. The default is true. Setting this to false will force the values of create_slot, enabled and copy_data to false. (You cannot combine setting connect to false with setting create_slot, enabled, or copy_data to true.)

Since no connection is made when this option is false, no tables are subscribed. To initiate replication, you must manually create the replication slot, enable the subscription, and refresh the subscription. See Section 31.2.3 for examples. 
`,
  },
  create_slot: {
    options: ["=true", "=false"],
    docs: ` (boolean) 
Specifies whether the command should create the replication slot on the publisher. The default is true.

If set to false, you are responsible for creating the publisher's slot in some other way. See Section 31.2.3 for examples.

`,
  },
  enabled: {
    options: ["=true", "=false"],
    docs: ` (boolean) 
Specifies whether the subscription should be actively replicating or whether it should just be set up but not started yet. The default is true.

`,
  },
  slot_name: {
    options: ["$slot_name"],
    docs: ` (string) 
Name of the publisher's replication slot to use. The default is to use the name of the subscription for the slot name.

Setting slot_name to NONE means there will be no replication slot associated with the subscription. Such subscriptions must also have both enabled and create_slot set to false. Use this when you will be creating the replication slot later manually. See Section 31.2.3 for examples.

The following parameters control the subscription's replication behavior after it has been created:

`,
  },
  binary: {
    options: ["=true", "=false"],
    docs: ` (boolean) 
Specifies whether the subscription will request the publisher to send the data in binary format (as opposed to text). The default is false. Any initial table synchronization copy (see copy_data) also uses the same format. Binary format can be faster than the text format, but it is less portable across machine architectures and PostgreSQL versions. Binary format is very data type specific; for example, it will not allow copying from a smallint column to an integer column, even though that would work fine in text format. Even when this option is enabled, only data types having binary send and receive functions will be transferred in binary. Note that the initial synchronization requires all data types to have binary send and receive functions, otherwise the synchronization will fail (see CREATE TYPE for more about send/receive functions).

When doing cross-version replication, it could be that the publisher has a binary send function for some data type, but the subscriber lacks a binary receive function for that type. In such a case, data transfer will fail, and the binary option cannot be used.

If the publisher is a PostgreSQL version before 16, then any initial table synchronization will use text format even if binary = true.

`,
  },
  copy_data: {
    options: ["=true", "=false"],
    docs: ` (boolean) 
Specifies whether to copy pre-existing data in the publications that are being subscribed to when the replication starts. The default is true.

If the publications contain WHERE clauses, it will affect what data is copied. Refer to the Notes for details.

See Notes for details of how copy_data = true can interact with the origin parameter.

`,
  },
  streaming: {
    options: ["=true", "=false"],
    docs: ` (enum) 
Specifies whether to enable streaming of in-progress transactions for this subscription. The default value is off, meaning all transactions are fully decoded on the publisher and only then sent to the subscriber as a whole.

If set to on, the incoming changes are written to temporary files and then applied only after the transaction is committed on the publisher and received by the subscriber.

If set to parallel, incoming changes are directly applied via one of the parallel apply workers, if available. If no parallel apply worker is free to handle streaming transactions then the changes are written to temporary files and applied after the transaction is committed. Note that if an error happens in a parallel apply worker, the finish LSN of the remote transaction might not be reported in the server log.

`,
  },
  synchronous_commit: {
    options: ["=off", "=on"],
    docs: ` (enum) 
The value of this parameter overrides the synchronous_commit setting within this subscription's apply worker processes. The default value is off.

It is safe to use off for logical replication: If the subscriber loses transactions because of missing synchronization, the data will be sent again from the publisher.

A different setting might be appropriate when doing synchronous logical replication. The logical replication workers report the positions of writes and flushes to the publisher, and when using synchronous replication, the publisher will wait for the actual flush. This means that setting synchronous_commit for the subscriber to off when the subscription is used for synchronous replication might increase the latency for COMMIT on the publisher. In this scenario, it can be advantageous to set synchronous_commit to local or higher.

`,
  },
  two_phase: {
    options: ["=true", "=false"],
    docs: ` (boolean) 
Specifies whether two-phase commit is enabled for this subscription. The default is false.

When two-phase commit is enabled, prepared transactions are sent to the subscriber at the time of PREPARE TRANSACTION, and are processed as two-phase transactions on the subscriber too. Otherwise, prepared transactions are sent to the subscriber only when committed, and are then processed immediately by the subscriber.

The implementation of two-phase commit requires that replication has successfully finished the initial table synchronization phase. So even when two_phase is enabled for a subscription, the internal two-phase state remains temporarily “pending” until the initialization phase completes. See column subtwophasestate of pg_subscription to know the actual two-phase state.

`,
  },
  disable_on_error: {
    options: ["=true", "=false"],
    docs: ` (boolean) 
Specifies whether the subscription should be automatically disabled if any errors are detected by subscription workers during data replication from the publisher. The default is false.

`,
  },
  password_required: {
    options: ["=true", "=false"],
    docs: ` (boolean) 
Specifies whether connections to the publisher made as a result of this subscription must use password authentication. This setting is ignored when the subscription is owned by a superuser. The default is true. Only superusers can set this value to false.

`,
  },
  run_as_owner: {
    options: ["=true", "=false"],
    docs: ` (boolean) 
If true, all replication actions are performed as the subscription owner. If false, replication workers will perform actions on each table as the owner of that table. The latter configuration is generally much more secure; for details, see Section 31.9. The default is false.

`,
  },
  origin: {
    options: ["=true", "=false"],
    docs: ` (string) 
Specifies whether the subscription will request the publisher to only send changes that don't have an origin or send changes regardless of origin. Setting origin to none means that the subscription will request the publisher to only send changes that don't have an origin. Setting origin to any means that the publisher sends changes regardless of their origin. The default is any.

See Notes for details of how copy_data = true can interact with the origin parameter.

`,
  },
} as const;
