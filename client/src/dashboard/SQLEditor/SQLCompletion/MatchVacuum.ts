import { getParentFunction } from "./MatchSelect";
import { getExpected } from "./getExpected";
import type { SQLMatcher } from "./registerSuggestions";
import { getKind } from "./registerSuggestions";
import type { KWD } from "./withKWDs";
import { withKWDs } from "./withKWDs";

export const MatchVacuum: SQLMatcher = {
  match: (cb) => cb.ftoken?.textLC === "vacuum",
  result: async ({ cb, ss, setS, sql }) => {
    const func = getParentFunction(cb);
    if (func?.func.textLC === "vacuum") {
      return withKWDs(
        Object.entries(options).map(([kwd, docs]) => ({ kwd, docs })),
        { cb, ss, setS, sql, opts: { notOrdered: true } },
      ).getSuggestion(",", ["(", ")"]);
    }

    if (cb.ltoken?.textLC === ")") {
      return getExpected("table", cb, ss);
    }

    return withKWDs(
      [
        {
          kwd: "VACUUM",
          expects: ["table"],
          options: [
            {
              label: "(options...)",
              insertText: "($0)",
              docs: Object.keys(options).join("\n\n"),
              kind: getKind("snippet"),
            },
          ],
        },
        {
          kwd: "VACUUM FULL",
          expects: ["table"],
          excludeIf: ["VACUUM"],
        },
      ] satisfies KWD[],
      { cb, ss, setS, sql },
    ).getSuggestion();
  },
};

const options = {
  FULL: `Selects “full” vacuum, which can reclaim more space, but takes much longer and exclusively locks the table. This method also requires extra disk space, since it writes a new copy of the table and doesn't release the old copy until the operation is complete. Usually this should only be used when a significant amount of space needs to be reclaimed from within the table.`,
  FREEZE: `Selects aggressive “freezing” of tuples. Specifying FREEZE is equivalent to performing VACUUM with the vacuum_freeze_min_age and vacuum_freeze_table_age parameters set to zero. Aggressive freezing is always performed when the table is rewritten, so this option is redundant when FULL is specified.`,
  VERBOSE: `Prints a detailed vacuum activity report for each table.`,
  ANALYZE: `Updates statistics used by the planner to determine the most efficient way to execute a query.`,
  DISABLE_PAGE_SKIPPING: `Normally, VACUUM will skip pages based on the visibility map. Pages where all tuples are known to be frozen can always be skipped, and those where all tuples are known to be visible to all transactions may be skipped except when performing an aggressive vacuum. Furthermore, except when performing an aggressive vacuum, some pages may be skipped in order to avoid waiting for other sessions to finish using them. This option disables all page-skipping behavior, and is intended to be used only when the contents of the visibility map are suspect, which should happen only if there is a hardware or software issue causing database corruption.`,
  SKIP_LOCKED: `Specifies that VACUUM should not wait for any conflicting locks to be released when beginning work on a relation: if a relation cannot be locked immediately without waiting, the relation is skipped. Note that even with this option, VACUUM may still block when opening the relation's indexes. Additionally, VACUUM ANALYZE may still block when acquiring sample rows from partitions, table inheritance children, and some types of foreign tables. Also, while VACUUM ordinarily processes all partitions of specified partitioned tables, this option will cause VACUUM to skip all partitions if there is a conflicting lock on the partitioned table.`,
  INDEX_CLEANUP: `Normally, VACUUM will skip index vacuuming when there are very few dead tuples in the table. The cost of processing all of the table's indexes is expected to greatly exceed the benefit of removing dead index tuples when this happens. This option can be used to force VACUUM to process indexes when there are more than zero dead tuples. The default is AUTO, which allows VACUUM to skip index vacuuming when appropriate. If INDEX_CLEANUP is set to ON, VACUUM will conservatively remove all dead tuples from indexes. This may be useful for backwards compatibility with earlier releases of PostgreSQL where this was the standard behavior.\nINDEX_CLEANUP can also be set to OFF to force VACUUM to always skip index vacuuming, even when there are many dead tuples in the table. This may be useful when it is necessary to make VACUUM run as quickly as possible to avoid imminent transaction ID wraparound (see Section 25.1.5). However, the wraparound failsafe mechanism controlled by vacuum_failsafe_age will generally trigger automatically to avoid transaction ID wraparound failure, and should be preferred. If index cleanup is not performed regularly, performance may suffer, because as the table is modified indexes will accumulate dead tuples and the table itself will accumulate dead line pointers that cannot be removed until index cleanup is completed.\nThis option has no effect for tables that have no index and is ignored if the FULL option is used. It also has no effect on the transaction ID wraparound failsafe mechanism. When triggered it will skip index vacuuming, even when INDEX_CLEANUP is set to ON.`,
  PROCESS_MAIN: `Specifies that VACUUM should attempt to process the main relation. This is usually the desired behavior and is the default. Setting this option to false may be useful when it is only necessary to vacuum a relation's corresponding TOAST table.`,
  PROCESS_TOAST: `Specifies that VACUUM should attempt to process the corresponding TOAST table for each relation, if one exists. This is usually the desired behavior and is the default. Setting this option to false may be useful when it is only necessary to vacuum the main relation. This option is required when the FULL option is used.`,
  TRUNCATE: `Specifies that VACUUM should attempt to truncate off any empty pages at the end of the table and allow the disk space for the truncated pages to be returned to the operating system. This is normally the desired behavior and is the default unless the vacuum_truncate option has been set to false for the table to be vacuumed. Setting this option to false may be useful to avoid ACCESS EXCLUSIVE lock on the table that the truncation requires. This option is ignored if the FULL option is used.`,
  PARALLEL: `Perform index vacuum and index cleanup phases of VACUUM in parallel using integer background workers (for the details of each vacuum phase, please refer to Table 28.45). The number of workers used to perform the operation is equal to the number of indexes on the relation that support parallel vacuum which is limited by the number of workers specified with PARALLEL option if any which is further limited by max_parallel_maintenance_workers. An index can participate in parallel vacuum if and only if the size of the index is more than min_parallel_index_scan_size. Please note that it is not guaranteed that the number of parallel workers specified in integer will be used during execution. It is possible for a vacuum to run with fewer workers than specified, or even with no workers at all. Only one worker can be used per index. So parallel workers are launched only when there are at least 2 indexes in the table. Workers for vacuum are launched before the start of each phase and exit at the end of the phase. These behaviors might change in a future release. This option can't be used with the FULL option.`,
  SKIP_DATABASE_STATS: `Specifies that VACUUM should skip updating the database-wide statistics about oldest unfrozen XIDs. Normally VACUUM will update these statistics once at the end of the command. However, this can take awhile in a database with a very large number of tables, and it will accomplish nothing unless the table that had contained the oldest unfrozen XID was among those vacuumed. Moreover, if multiple VACUUM commands are issued in parallel, only one of them can update the database-wide statistics at a time. Therefore, if an application intends to issue a series of many VACUUM commands, it can be helpful to set this option in all but the last such command; or set it in all the commands and separately issue VACUUM (ONLY_DATABASE_STATS) afterwards.`,
  ONLY_DATABASE_STATS: `Specifies that VACUUM should do nothing except update the database-wide statistics about oldest unfrozen XIDs. When this option is specified, the table_and_columns list must be empty, and no other option may be enabled except VERBOSE.`,
  BUFFER_USAGE_LIMIT: `Specifies the Buffer Access Strategy ring buffer size for VACUUM. This size is used to calculate the number of shared buffers which will be reused as part of this strategy. 0 disables use of a Buffer Access Strategy. If ANALYZE is also specified, the BUFFER_USAGE_LIMIT value is used for both the vacuum and analyze stages. This option can't be used with the FULL option except if ANALYZE is also specified. When this option is not specified, VACUUM uses the value from vacuum_buffer_usage_limit. Higher settings can allow VACUUM to run more quickly, but having too large a setting may cause too many other useful pages to be evicted from shared buffers. The minimum value is 128 kB and the maximum value is 16 GB.`,
};
