import type { missingKeywordDocumentation } from "../SQLEditorSuggestions";
import { STARTING_KEYWORDS } from "./CommonMatchImports";

export type TopKeyword = {
  label: string;
  info?: string;
  start_kwd: boolean;
  priority?: number;
  insertText: string | undefined;
};

/**
 * https://www.postgresql.org/docs/16/sql-commands.html
 */
export const STARTING_KWDS = [
  "SELECT",
  "REVOKE",
  "GRANT",
  "VACUUM",
  "EXPLAIN",
  "COPY",
  "REINDEX",
  "ROLLBACK",
  "WITH",
  "ALTER",
  "SET",
  "DO",
  "BEGIN",
  "CALL",
  "COMMENT",
  "DROP",
  "CREATE",
  "UPDATE",
  "INSERT INTO",
  "DELETE FROM",
  "NOTIFY",
  "LISTEN",
  "SHOW",
  "TRUNCATE",
  "REASSIGN",
  "CLUSTER",
  "DELETE",
  "INSERT",
  "PREPARE",
  "EXECUTE",
  "RESET",
] as const;

export const asSQL = (v: string, lang = "sql") =>
  "```" + lang + "\n" + v + "\n```";
export function getTopKeywords(): TopKeyword[] {
  return (
    STARTING_KEYWORDS as Exclude<
      typeof STARTING_KEYWORDS,
      keyof typeof missingKeywordDocumentation
    >
  )
    .map((label) => {
      let info;
      let start_kwd = STARTING_KWDS.includes(label as any);
      let priority = 99;
      let insertText: string | undefined;

      if (label === "REASSIGN") {
        priority = 0;
        info = `REASSIGN OWNED instructs the system to change the ownership of database objects owned by any of the old_roles to new_role.
https://www.postgresql.org/docs/current/sql-reassign-owned.html

${asSQL(`REASSIGN OWNED BY CURRENT_ROLE TO new_role;`)}`;
      } else if (label === "TRUNCATE") {
        priority = 14;

        info = `TRUNCATE quickly removes all rows from a set of tables. It has the same effect as an unqualified DELETE on each table, but since it does not actually scan the tables it is faster. 
Furthermore, it reclaims disk space immediately, rather than requiring a subsequent VACUUM operation. This is most useful on large tables.

https://www.postgresql.org/docs/current/sql-truncate.html
`;
      } else if (label === "CLUSTER") {
        priority = 16;

        info = `CLUSTER instructs PostgreSQL to cluster the table specified by table_name based on the index specified by index_name. The index must already have been defined on table_name.

When a table is clustered, it is physically reordered based on the index information. Clustering is a one-time operation: when the table is subsequently updated, the changes are not clustered. That is, no attempt is made to store new or updated rows according to their index order. (If one wishes, one can periodically recluster by issuing the command again. Also, setting the table's fillfactor storage parameter to less than 100% can aid in preserving cluster ordering during updates, since updated rows are kept on the same page if enough space is available there.)

When a table is clustered, PostgreSQL remembers which index it was clustered by. The form CLUSTER table_name reclusters the table using the same index as before. You can also use the CLUSTER or SET WITHOUT CLUSTER forms of ALTER TABLE to set the index to be used for future cluster operations, or to clear any previous setting.

CLUSTER without a table_name reclusters all the previously-clustered tables in the current database that the calling user owns, or all such tables if called by a superuser. This form of CLUSTER cannot be executed inside a transaction block.

When a table is being clustered, an ACCESS EXCLUSIVE lock is acquired on it. This prevents any other database operations (both reads and writes) from operating on the table until the CLUSTER is finished.
https://www.postgresql.org/docs/current/sql-cluster.html
`;
      } else if (label === "PREPARE") {
        priority = 14;

        info = `PREPARE creates a prepared statement. A prepared statement is a server-side object that can be used to optimize performance. When the PREPARE statement is executed, the specified statement is parsed, analyzed, and rewritten. When an EXECUTE command is subsequently issued, the prepared statement is planned and executed. This division of labor avoids repetitive parse analysis work, while allowing the execution plan to depend on the specific parameter values supplied.

https://www.postgresql.org/docs/current/sql-prepare.html
`;
      } else if (label === "EXECUTE") {
        priority = 14;

        info = `EXECUTE is used to execute a previously prepared statement. Since prepared statements only exist for the duration of a session, the prepared statement must have been created by a PREPARE statement executed earlier in the current session.

https://www.postgresql.org/docs/current/sql-execute.html
`;
      } else if (label === "SELECT") {
        priority = 0;

        info = `Retrieves data from tables, functions or other objects   
https://www.postgresql.org/docs/current/sql-select.html
\`\`\`sql
SELECT * FROM users;

SELECT version();

SELECT  f1, f2, MAX(f12)
FROM table_name 
WHERE f1 = 2 
GROUP BY col2
HAVING MAX(f12) < 10
ORDER BY f1 DESC
LIMIT 1
OFFSET 2

-- Create table from select
CREATE TABLE archived_users AS
SELECT * FROM users 
\`\`\`
`;
      } else if (label === "SHOW") {
        info = `Show the value of a run-time parameter. These variables can be set using the SET statement
  https://www.postgresql.org/docs/current/sql-show.html
\`\`\`sql
SHOW datestyle

SHOW ALL
\`\`\`
`;
      } else if (label === "TABLE") {
        start_kwd = true;
        info = `
\`\`\`sql
\`\`\`
`;
      } else if (label === "LISTEN") {
        info = `Listen to NOTIFY notifications on a channel
https://www.postgresql.org/docs/current/sql-listen.html
\`\`\`sql
LISTEN my_channel;

/* To push a message */
NOTIFY my_channel, 'hello';
\`\`\`
`;
      } else if (label === "NOTIFY") {
        info = `Send a notification to a channel
https://www.postgresql.org/docs/current/sql-notify.html
\`\`\`sql
NOTIFY my_channel, 'hello';


/* To listen to this channel */
LISTEN my_channel;
\`\`\`
`;
      } else if (label === "DELETE FROM") {
        priority = 4;

        info = `Delete data from a table    
https://www.postgresql.org/docs/current/sql-delete.html
\`\`\`sql
DELETE FROM table_name;

DELETE FROM users
WHERE last_active < now() - interval'1 month'
RETURNING *
\`\`\`
`;
      } else if (label === "INSERT INTO") {
        priority = 1;

        info = `Insert data into a table  
https://www.postgresql.org/docs/current/sql-insert.html
\`\`\`sql
INSERT INTO some_table 
DEFAULT VALUES;

INSERT INTO users(age, name, added)
VALUES(112, 'a', now())
RETURNING *;

INSERT INTO users(age, name, added)
SELECT age, name, added
FROM archived_users
\`\`\`
`;
      } else if (label === "UPDATE") {
        priority = 2;

        info = `Updates data in a table
https://www.postgresql.org/docs/current/sql-update.html
\`\`\`sql
UPDATE users SET status = 'active';

UPDATE books 
SET title = books || 'active'
WHERE title NOT ILIKE 'title%';

\`\`\`
`;
      } else if (label === "CREATE") {
        priority = 3;

        info = `Create an object
\`\`\`sql
CREATE TABLE users(
  age INTEGER,  
  name TEXT,  
  type TEXT,  
  added TIMESTAMP  
);

CREATE OR REPLACE VIEW admin_users AS 
  SELECT * FROM users WHERE type = 'admin';

CREATE OR REPLACE FUNCTION log_message(VARIADIC args TEXT[]) RETURNS VOID AS $func$    
BEGIN

  IF to_regclass('logs') IS NULL THEN
    CREATE TABLE IF NOT EXISTS logs(m TEXT);
  END IF;

  INSERT INTO logs(m) 
  VALUES(concat_ws(' ', args));

END;
$func$ LANGUAGE plpgsql;

\`\`\`
`;
      } else if (label === "DROP") {
        priority = 5;

        info = `Drop an object  
\`\`\`sql
DROP TABLE users;

DROP TABLE IF EXISTS books;

DROP VIEW admin_users;
\`\`\`
`;
      } else if (label === "COMMENT") {
        info = `Adds a comment to an object
https://www.postgresql.org/docs/current/sql-comment.html
\`\`\`sql
COMMENT ON FUNCTION log_message 
IS 'Concat and insert arguments into logs table';

--To view a table comment
SELECT obj_description('table_name'::REGCLASS)

--To view a column comment (1 is col position)
SELECT col_description('public.dwadwad'::REGCLASS, 1)

\`\`\`
`;
      } else if (label === "BEGIN") {
        info = `Initiates a transaction block where all statements will be executed in a single transaction until an explicit COMMIT or ROLLBACK is given
https://www.postgresql.org/docs/current/sql-begin.html
\`\`\`sql
BEGIN;
UPDATE orders SET price = 2;
COMMIT;

BEGIN ISOLATION LEVEL SERIALIZABLE;
UPDATE orders SET price = 2;
COMMIT;
\`\`\`
`;
      } else if (label === "CALL") {
        info = `invoke a procedure
  https://www.postgresql.org/docs/current/sql-call.html
  \`\`\`sql
  CALL my_procedure();
  \`\`\`
  `;
      } else if (label === "DO") {
        insertText = `DO $$ 
  /* DECLARE some_var data_type; */
BEGIN
  $0
END $$;
`;
        info = `Execute an anonymous code block
https://www.postgresql.org/docs/current/sql-do.html
\`\`\`sql
${insertText}
\`\`\`
`;
      } else if (label === "SET") {
        priority = 7;

        info = `
  
Change a run-time parameter:
https://www.postgresql.org/docs/current/sql-set.html  

${asSQL("SET datestyle TO postgres, dmy;")}  
`;
      } else if (label === "RESET") {
        priority = 7;

        info = `
Restore the value of a run-time parameter to the default value 
https://www.postgresql.org/docs/current/sql-reset.html   

${asSQL("RESET datestyle;\n\nRESET ALL;")}  

`;
      } else if (label === "ALTER") {
        priority = 7;

        info = `Change an object
\`\`\`sql
ALTER TABLE users 
ADD COLUMN deleted BOOLEAN;

ALTER DATABASE database_name 
SET datestyle TO "ISO, DMY";

\`\`\`
`;
      } else if (label === "WITH") {
        priority = 6;

        info = `Specifies a temporary named result set
https://www.postgresql.org/docs/current/queries-with.html
\`\`\`sql
WITH cte1 AS (SELECT * FROM orders)
, cte2 AS (SELECT * FROM customers)
SELECT *
FROM cte1 c1
INNER JOIN cte2 c2
  ON ........

\`\`\`
`;
      } else if (label === "ROLLBACK") {
        info = `rolls back the current transaction and causes all the updates made by the transaction to be discarded.
https://www.postgresql.org/docs/9.4/sql-rollback.html
\`\`\`sql 
BEGIN;
UPDATE orders SET price = 2;
ROLLBACK;
\`\`\`
`;
      } else if (label === "REINDEX") {
        info = `Rebuild indexes
https://www.postgresql.org/docs/current/sql-reindex.html
\`\`\`sql
REINDEX TABLE CONCURRENTLY my_broken_table;
\`\`\`
`;
      } else if (label === "COPY") {
        info = `Export or import data
https://www.postgresql.org/docs/current/sql-copy.html
\`\`\`sql
-- Export to csv
COPY my_table TO '/tmp/my_table.csv' 
WITH (FORMAT CSV, HEADER);

-- Import from csv (Must create table beforehand)
COPY zip_codes 
FROM '/path/to/ZIP_CODES.txt' 
DELIMITER ',' CSV HEADER;
\`\`\`
`;
      } else if (label === "VALUES") {
        info = `VALUES provides a way to generate a “constant table” that can be used in a query
https://www.postgresql.org/docs/current/queries-values.html
\`\`\`sql
INSERT INTO cities(name)
VALUES ('London'), ('Vilnius');
\`\`\`
`;
      } else if (label === "EXPLAIN") {
        priority = 10;
        info = `Get query plan of a query
https://www.postgresql.org/docs/current/sql-explain.html
\`\`\`sql
EXPLAIN SELECT * FROM weather;

EXPLAIN ANALYZE SELECT * FROM weather;
\`\`\`
`;
      } else if (label === "VACUUM") {
        priority = 11;

        info = `Garbage-collect and optionally analyze a database
https://www.postgresql.org/docs/current/sql-vacuum.html
\`\`\`sql
VACUUM (VERBOSE, ANALYZE) my_database;
\`\`\`
`;
      } else if (label === "GRANT") {
        priority = 9;

        info = `The GRANT command has two basic variants: 
  1. one that grants privileges on a database object (table, column, view, sequence, database, foreign-data wrapper, foreign server, function, procedural language, schema, or tablespace),
  2. one that grants membership in a role
  https://www.postgresql.org/docs/current/sql-grant.html

\`\`\`sql
GRANT INSERT, UPDATE ON films TO PUBLIC;
\`\`\`
`;
      } else if (label === "REVOKE") {
        priority = 10;

        info = `The REVOKE command revokes previously granted privileges from one or more roles. The key word PUBLIC refers to the implicitly defined group of all roles.
https://www.postgresql.org/docs/current/sql-revoke.html

\`\`\`sql
REVOKE INSERT, UPDATE ON films TO PUBLIC;

/* Revoke membership in role admins from user joe */
REVOKE admins FROM joe;

\`\`\`
`;
      }

      // garbage-collect and optionally analyze a database

      return { label, info, start_kwd, priority, insertText };
    })
    .sort((a, b) => a.priority - b.priority);
}

export const TOP_KEYWORDS = getTopKeywords();
