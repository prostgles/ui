import { fixIndent } from "../../demo/sqlVideoDemo";

export const SQL_SNIPPETS: { label: string; info: string; query: string }[] = [
  {
    label: "Cache Hit Ratio",
    info: `Ideal caching ratio is 0.99 or higher, which means that at least 99% of reads are performed from the cache and no more than 1% from disk`,
    query: `SELECT relname, 
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit)  as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM 
  pg_statio_user_tables
WHERE heap_blks_read <> 0
GROUP BY relname`,
  },
  {
    label: "Index usage",
    info: "",
    query: `
SELECT relname,   
  100 * idx_scan / (seq_scan + idx_scan) percent_of_times_index_used,   
  n_live_tup rows_in_table 
FROM pg_stat_user_tables 
WHERE seq_scan + idx_scan > 0 
ORDER BY n_live_tup DESC;
`,
  },
  {
    label: "Active queries",
    info: "",
    query: fixIndent(`
      SELECT 
        datid, datname, pid, usesysid, usename, application_name, client_addr, 
        client_hostname, client_port, backend_start, xact_start, query_start, 
        state_change, wait_event_type, wait_event, state, 
        backend_xid, backend_xmin, query, backend_type, 
        pg_blocking_pids(pid) as blocked_by,
        COALESCE(cardinality(pg_blocking_pids(pid)), 0) blocked_by_num,
        md5(pid || query) as id_query_hash
      FROM pg_catalog.pg_stat_activity
      WHERE pid <> pg_backend_pid() `),
  },
];
