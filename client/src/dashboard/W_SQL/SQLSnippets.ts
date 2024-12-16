export const SQL_SNIPPETS = [
  {
    label: "CREATE TABLE",
    info: "Create a table within the current database",
    sql: `/* DROP TABLE IF EXISTS my_new_table; */
  CREATE TABLE /* IF NOT EXISTS */ my_new_table (

    /* Auto incrementing key */
    id  SERIAL PRIMARY KEY

    username    TEXT NOT NULL,
    first_name  TEXT NOT NULL,
    last_name   TEXT NOT NULL,
    created     TIMESTAMP DEFAULT NOW()

);
/* 
Alternatively, you can use a UUID PRIMARY KEY. This requires pgcrypto extension to be installed:
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  id UUID PRIMARY KEY DEFAULT gen_random_uuid()

To reference a (unique) column from another table:
  user_id UUID NOT NULL REFERENCES users(id), 
*/`,
  },
  {
    label: "INSERT ROWS",
    info: "Add data to a table",
    sql: `INSERT INTO my_new_table (col1, col2, col3)
VALUES 
  (1, 1, 1),
  (2, 2, 2),
  (3, 3, 3);

/* From select */
INSERT INTO my_new_table (col1, col2, col3)
SELECT col1, col2, col3 
FROM my_other_table
WHERE col3 = 33;
`,
  },
  {
    label: "DELETE ROWS",
    info: "Delete data from a table",
    sql: `DELETE FROM my_new_table
WHERE col3 = 33;

/* To delete matching records in a child table where a foreign key relationship is in place */
DELETE FROM my_new_table CASCADE
WHERE col3 = 33;
`,
  },
  {
    label: "UPDATE ROWS",
    info: "Update data in a table",
    sql: `UPDATE my_new_table
SET status = 'active'
WHERE username = 'me'

/* From select */
UPDATE my_new_table
SET customer = subquery.customer,
  address = subquery.address
FROM (
  SELECT customer, address, row_id
  FROM ...
) AS subquery
WHERE my_new_table.row_id = subquery.row_id;
`,
  },
  {
    label: "DROP TABLE",
    info: "Drop a table",
    sql: `DROP TABLE /* IF EXISTS */ my_new_table;`,
  },
  {
    label: "RENAME A TABLE",
    info: "Rename a table. Change table name",
    sql: `ALTER TABLE my_table
RENAME TO my_new_table;`,
  },
  {
    label: "VACUUM A TABLE",
    info: "Vacuum a table. Reclaims storage occupied by dead tuples",
    sql: `VACUUM /* FULL */ my_table;`,
  },
  {
    label: "COMMENT A TABLE",
    info: "Comment on a table ",
    sql: `COMMENT ON TABLE my_table IS 'My comment';`,
  },
  {
    label: "ADD NEW COLUMN",
    info: "Add a new column to an existing table",
    sql: `ALTER TABLE my_table ADD COLUMN new_colname INTEGER;`,
  },
  {
    label: "RENAME COLUMN",
    info: "Add a new column to an existing table",
    sql: `ALTER TABLE my_table RENAME COLUMN colname TO new_colname;`,
  },
  {
    label: "CHANGE COLUMN DATA TYPE",
    info: "Change an existing column data type",
    sql: `ALTER TABLE my_table ALTER COLUMN colname TYPE TIMESTAMP;

/* To apply a function during conversion */
ALTER TABLE my_table ALTER COLUMN colname TYPE TIMESTAMP USING to_timestamp(colname, 'yyyy-mm-dd');
`,
  },
  {
    label: "ADD FOREIGN KEY",
    info: "Add a FOREIGN KEY/REFERENCES constraint to an existing column from table",
    sql: `ALTER TABLE my_table
ADD FOREIGN KEY (table2_id) 
REFERENCES table2 ( id );`,
  },
  {
    label: "ADD PRIMARY KEY",
    info: "Add a PRIMARY KEY constraint to an existing column from table",
    sql: `ALTER TABLE my_table
  ADD PRIMARY KEY (colname) 
  `,
  },
  {
    label: "DROP COLUMN",
    info: "Drops/Removes column from a table",
    sql: `ALTER TABLE my_table
DROP COLUMN colname `,
  },
  {
    label: "CREATE USER",
    info: "Creates a user",
    sql: `CREATE USER new_user WITH ENCRYPTED PASSWORD 'the_password';

/* To allow user access to a database */
GRANT ALL PRIVILEGES ON DATABASE my_db TO new_user;

/* To grant full control to user */
ALTER USER new_user WITH SUPERUSER 
`,
  },
  {
    label: "CREATE DATABASE",
    info: "Creates a database",
    sql: `CREATE DATABASE my_db OWNER my_user /* OWNER is optional */ ;`,
  },
  {
    label: "DROP DATABASE",
    info: "Drops/removes a database",
    sql: `
DROP DATABASE my_db;

/* If database is in use will need to close all connections to it except this */
SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity 
WHERE pg_stat_activity.datname = 'my_db' AND pid <> pg_backend_pid();
`,
  },
  {
    label: "CREATE TRIGGER",
    info: "Create trigger on data change",
    sql: `CREATE OR REPLACE FUNCTION order_on_insert
  RETURNS trigger AS
$$

BEGIN

  INSERT INTO orders_audit (id, customer_id, product_id, added)
  VALUES(NEW.id, NEW.customer_id, NEW.product_id, now());

  RETURN NEW;

END;

$$
LANGUAGE 'plpgsql';

CREATE TRIGGER order_on_insert_trigger
AFTER INSERT
ON orders
FOR EACH ROW
EXECUTE PROCEDURE order_on_insert();`,
  },
  {
    label: "CREATE EXTENSION",
    info: "Creates/enables/installs an extension",
    sql: `/*** Some extensions are included in the default installation ***/
/* Provides cryptographic functions  */
CREATE EXTENSION pgcrypto;

/* Track statistics on the queries executed by a Postgres database */
CREATE EXTENSION pg_stat_statements;

/* Allows using a Foreign Data Wrapper to access tables on remote Postgres servers */
CREATE EXTENSION postgres_fdw;

/*** Other extensions need to be installed first ***/  
/* Adds support for geographic and geometric data types and functions */  
CREATE EXTENSION IF NOT EXISTS postgis;

`,
  },
  {
    label: "Clone database",
    info: "Create a copy/clone of an existing database",
    sql: `/* originaldb must be idle/not accessed by other users */
CREATE DATABASE newdb WITH TEMPLATE originaldb OWNER dbuser;

/* To make originaldb idle */
SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity 
WHERE pg_stat_activity.datname = 'originaldb' AND pid <> pg_backend_pid();
  `,
  },
] as const;
