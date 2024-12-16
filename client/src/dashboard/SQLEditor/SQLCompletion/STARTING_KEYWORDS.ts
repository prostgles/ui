/**
 * Starting keywords for SQL autocompletion
 * https://www.postgresql.org/docs/16/sql-commands.html
 

  Array.from(document.querySelector("dl.toc").querySelectorAll("dt")).map(dt => {
    const kwd = dt.querySelector(".refentrytitle").innerText;
    const docs = dt.querySelector(".refpurpose").innerText.replace("— ", "");
    const url = dt.querySelector(".refentrytitle").querySelector("a").href;
    return { kwd, docs, url };
  });

 */

export const STARTING_KEYWORDS = [
  {
    kwd: "ABORT",
    docs: "abort the current transaction",
    url: "https://www.postgresql.org/docs/16/sql-abort.html",
  },
  {
    kwd: "ALTER AGGREGATE",
    docs: "change the definition of an aggregate function",
    url: "https://www.postgresql.org/docs/16/sql-alteraggregate.html",
  },
  {
    kwd: "ALTER COLLATION",
    docs: "change the definition of a collation",
    url: "https://www.postgresql.org/docs/16/sql-altercollation.html",
  },
  {
    kwd: "ALTER CONVERSION",
    docs: "change the definition of a conversion",
    url: "https://www.postgresql.org/docs/16/sql-alterconversion.html",
  },
  {
    kwd: "ALTER DATABASE",
    docs: "change a database",
    url: "https://www.postgresql.org/docs/16/sql-alterdatabase.html",
  },
  {
    kwd: "ALTER DEFAULT PRIVILEGES",
    docs: "define default access privileges",
    url: "https://www.postgresql.org/docs/16/sql-alterdefaultprivileges.html",
  },
  {
    kwd: "ALTER DOMAIN",
    docs: "change the definition of a domain",
    url: "https://www.postgresql.org/docs/16/sql-alterdomain.html",
  },
  {
    kwd: "ALTER EVENT TRIGGER",
    docs: "change the definition of an event trigger",
    url: "https://www.postgresql.org/docs/16/sql-altereventtrigger.html",
  },
  {
    kwd: "ALTER EXTENSION",
    docs: "change the definition of an extension",
    url: "https://www.postgresql.org/docs/16/sql-alterextension.html",
  },
  {
    kwd: "ALTER FOREIGN DATA WRAPPER",
    docs: "change the definition of a foreign-data wrapper",
    url: "https://www.postgresql.org/docs/16/sql-alterforeigndatawrapper.html",
  },
  {
    kwd: "ALTER FOREIGN TABLE",
    docs: "change the definition of a foreign table",
    url: "https://www.postgresql.org/docs/16/sql-alterforeigntable.html",
  },
  {
    kwd: "ALTER FUNCTION",
    docs: "change the definition of a function",
    url: "https://www.postgresql.org/docs/16/sql-alterfunction.html",
  },
  {
    kwd: "ALTER GROUP",
    docs: "change role name or membership",
    url: "https://www.postgresql.org/docs/16/sql-altergroup.html",
  },
  {
    kwd: "ALTER INDEX",
    docs: "change the definition of an index",
    url: "https://www.postgresql.org/docs/16/sql-alterindex.html",
  },
  {
    kwd: "ALTER LANGUAGE",
    docs: "change the definition of a procedural language",
    url: "https://www.postgresql.org/docs/16/sql-alterlanguage.html",
  },
  {
    kwd: "ALTER LARGE OBJECT",
    docs: "change the definition of a large object",
    url: "https://www.postgresql.org/docs/16/sql-alterlargeobject.html",
  },
  {
    kwd: "ALTER MATERIALIZED VIEW",
    docs: "change the definition of a materialized view",
    url: "https://www.postgresql.org/docs/16/sql-altermaterializedview.html",
  },
  {
    kwd: "ALTER OPERATOR",
    docs: "change the definition of an operator",
    url: "https://www.postgresql.org/docs/16/sql-alteroperator.html",
  },
  {
    kwd: "ALTER OPERATOR CLASS",
    docs: "change the definition of an operator class",
    url: "https://www.postgresql.org/docs/16/sql-alteropclass.html",
  },
  {
    kwd: "ALTER OPERATOR FAMILY",
    docs: "change the definition of an operator family",
    url: "https://www.postgresql.org/docs/16/sql-alteropfamily.html",
  },
  {
    kwd: "ALTER POLICY",
    docs: "change the definition of a row-level security policy",
    url: "https://www.postgresql.org/docs/16/sql-alterpolicy.html",
  },
  {
    kwd: "ALTER PROCEDURE",
    docs: "change the definition of a procedure",
    url: "https://www.postgresql.org/docs/16/sql-alterprocedure.html",
  },
  {
    kwd: "ALTER PUBLICATION",
    docs: "change the definition of a publication",
    url: "https://www.postgresql.org/docs/16/sql-alterpublication.html",
  },
  {
    kwd: "ALTER ROLE",
    docs: "change a database role",
    url: "https://www.postgresql.org/docs/16/sql-alterrole.html",
  },
  {
    kwd: "ALTER ROUTINE",
    docs: "change the definition of a routine",
    url: "https://www.postgresql.org/docs/16/sql-alterroutine.html",
  },
  {
    kwd: "ALTER RULE",
    docs: "change the definition of a rule",
    url: "https://www.postgresql.org/docs/16/sql-alterrule.html",
  },
  {
    kwd: "ALTER SCHEMA",
    docs: "change the definition of a schema",
    url: "https://www.postgresql.org/docs/16/sql-alterschema.html",
  },
  {
    kwd: "ALTER SEQUENCE",
    docs: "change the definition of a sequence generator",
    url: "https://www.postgresql.org/docs/16/sql-altersequence.html",
  },
  {
    kwd: "ALTER SERVER",
    docs: "change the definition of a foreign server",
    url: "https://www.postgresql.org/docs/16/sql-alterserver.html",
  },
  {
    kwd: "ALTER STATISTICS",
    docs: "change the definition of an extended statistics object",
    url: "https://www.postgresql.org/docs/16/sql-alterstatistics.html",
  },
  {
    kwd: "ALTER SUBSCRIPTION",
    docs: "change the definition of a subscription",
    url: "https://www.postgresql.org/docs/16/sql-altersubscription.html",
  },
  {
    kwd: "ALTER SYSTEM",
    docs: "change a server configuration parameter",
    url: "https://www.postgresql.org/docs/16/sql-altersystem.html",
  },
  {
    kwd: "ALTER TABLE",
    docs: "change the definition of a table",
    url: "https://www.postgresql.org/docs/16/sql-altertable.html",
  },
  {
    kwd: "ALTER TABLESPACE",
    docs: "change the definition of a tablespace",
    url: "https://www.postgresql.org/docs/16/sql-altertablespace.html",
  },
  {
    kwd: "ALTER TEXT SEARCH CONFIGURATION",
    docs: "change the definition of a text search configuration",
    url: "https://www.postgresql.org/docs/16/sql-altertsconfig.html",
  },
  {
    kwd: "ALTER TEXT SEARCH DICTIONARY",
    docs: "change the definition of a text search dictionary",
    url: "https://www.postgresql.org/docs/16/sql-altertsdictionary.html",
  },
  {
    kwd: "ALTER TEXT SEARCH PARSER",
    docs: "change the definition of a text search parser",
    url: "https://www.postgresql.org/docs/16/sql-altertsparser.html",
  },
  {
    kwd: "ALTER TEXT SEARCH TEMPLATE",
    docs: "change the definition of a text search template",
    url: "https://www.postgresql.org/docs/16/sql-altertstemplate.html",
  },
  {
    kwd: "ALTER TRIGGER",
    docs: "change the definition of a trigger",
    url: "https://www.postgresql.org/docs/16/sql-altertrigger.html",
  },
  {
    kwd: "ALTER TYPE",
    docs: "change the definition of a type",
    url: "https://www.postgresql.org/docs/16/sql-altertype.html",
  },
  {
    kwd: "ALTER USER",
    docs: "change a database role",
    url: "https://www.postgresql.org/docs/16/sql-alteruser.html",
  },
  {
    kwd: "ALTER USER MAPPING",
    docs: "change the definition of a user mapping",
    url: "https://www.postgresql.org/docs/16/sql-alterusermapping.html",
  },
  {
    kwd: "ALTER VIEW",
    docs: "change the definition of a view",
    url: "https://www.postgresql.org/docs/16/sql-alterview.html",
  },
  {
    kwd: "ANALYZE",
    docs: "collect statistics about a database",
    url: "https://www.postgresql.org/docs/16/sql-analyze.html",
  },
  {
    kwd: "BEGIN",
    docs: "start a transaction block",
    url: "https://www.postgresql.org/docs/16/sql-begin.html",
  },
  {
    kwd: "CALL",
    docs: "invoke a procedure",
    url: "https://www.postgresql.org/docs/16/sql-call.html",
  },
  {
    kwd: "CHECKPOINT",
    docs: "force a write-ahead log checkpoint",
    url: "https://www.postgresql.org/docs/16/sql-checkpoint.html",
  },
  {
    kwd: "CLOSE",
    docs: "close a cursor",
    url: "https://www.postgresql.org/docs/16/sql-close.html",
  },
  {
    kwd: "CLUSTER",
    docs: "cluster a table according to an index",
    url: "https://www.postgresql.org/docs/16/sql-cluster.html",
  },
  {
    kwd: "COMMENT",
    docs: "define or change the comment of an object",
    url: "https://www.postgresql.org/docs/16/sql-comment.html",
  },
  {
    kwd: "COMMIT",
    docs: "commit the current transaction",
    url: "https://www.postgresql.org/docs/16/sql-commit.html",
  },
  {
    kwd: "COMMIT PREPARED",
    docs: "commit a transaction that was earlier prepared for two-phase commit",
    url: "https://www.postgresql.org/docs/16/sql-commit-prepared.html",
  },
  {
    kwd: "COPY",
    docs: "copy data between a file and a table",
    url: "https://www.postgresql.org/docs/16/sql-copy.html",
  },
  {
    kwd: "CREATE ACCESS METHOD",
    docs: "define a new access method",
    url: "https://www.postgresql.org/docs/16/sql-create-access-method.html",
  },
  {
    kwd: "CREATE AGGREGATE",
    docs: "define a new aggregate function",
    url: "https://www.postgresql.org/docs/16/sql-createaggregate.html",
  },
  {
    kwd: "CREATE CAST",
    docs: "define a new cast",
    url: "https://www.postgresql.org/docs/16/sql-createcast.html",
  },
  {
    kwd: "CREATE COLLATION",
    docs: "define a new collation",
    url: "https://www.postgresql.org/docs/16/sql-createcollation.html",
  },
  {
    kwd: "CREATE CONVERSION",
    docs: "define a new encoding conversion",
    url: "https://www.postgresql.org/docs/16/sql-createconversion.html",
  },
  {
    kwd: "CREATE DATABASE",
    docs: "create a new database",
    url: "https://www.postgresql.org/docs/16/sql-createdatabase.html",
  },
  {
    kwd: "CREATE DOMAIN",
    docs: "define a new domain",
    url: "https://www.postgresql.org/docs/16/sql-createdomain.html",
  },
  {
    kwd: "CREATE EVENT TRIGGER",
    docs: "define a new event trigger",
    url: "https://www.postgresql.org/docs/16/sql-createeventtrigger.html",
  },
  {
    kwd: "CREATE EXTENSION",
    docs: "install an extension",
    url: "https://www.postgresql.org/docs/16/sql-createextension.html",
  },
  {
    kwd: "CREATE FOREIGN DATA WRAPPER",
    docs: "define a new foreign-data wrapper",
    url: "https://www.postgresql.org/docs/16/sql-createforeigndatawrapper.html",
  },
  {
    kwd: "CREATE FOREIGN TABLE",
    docs: "define a new foreign table",
    url: "https://www.postgresql.org/docs/16/sql-createforeigntable.html",
  },
  {
    kwd: "CREATE FUNCTION",
    docs: "define a new function",
    url: "https://www.postgresql.org/docs/16/sql-createfunction.html",
  },
  {
    kwd: "CREATE GROUP",
    docs: "define a new database role",
    url: "https://www.postgresql.org/docs/16/sql-creategroup.html",
  },
  {
    kwd: "CREATE INDEX",
    docs: "define a new index",
    url: "https://www.postgresql.org/docs/16/sql-createindex.html",
  },
  {
    kwd: "CREATE LANGUAGE",
    docs: "define a new procedural language",
    url: "https://www.postgresql.org/docs/16/sql-createlanguage.html",
  },
  {
    kwd: "CREATE MATERIALIZED VIEW",
    docs: "define a new materialized view",
    url: "https://www.postgresql.org/docs/16/sql-creatematerializedview.html",
  },
  {
    kwd: "CREATE OPERATOR",
    docs: "define a new operator",
    url: "https://www.postgresql.org/docs/16/sql-createoperator.html",
  },
  {
    kwd: "CREATE OPERATOR CLASS",
    docs: "define a new operator class",
    url: "https://www.postgresql.org/docs/16/sql-createopclass.html",
  },
  {
    kwd: "CREATE OPERATOR FAMILY",
    docs: "define a new operator family",
    url: "https://www.postgresql.org/docs/16/sql-createopfamily.html",
  },
  {
    kwd: "CREATE POLICY",
    docs: "define a new row-level security policy for a table",
    url: "https://www.postgresql.org/docs/16/sql-createpolicy.html",
  },
  {
    kwd: "CREATE PROCEDURE",
    docs: "define a new procedure",
    url: "https://www.postgresql.org/docs/16/sql-createprocedure.html",
  },
  {
    kwd: "CREATE PUBLICATION",
    docs: "define a new publication",
    url: "https://www.postgresql.org/docs/16/sql-createpublication.html",
  },
  {
    kwd: "CREATE ROLE",
    docs: "define a new database role",
    url: "https://www.postgresql.org/docs/16/sql-createrole.html",
  },
  {
    kwd: "CREATE RULE",
    docs: "define a new rewrite rule",
    url: "https://www.postgresql.org/docs/16/sql-createrule.html",
  },
  {
    kwd: "CREATE SCHEMA",
    docs: "define a new schema",
    url: "https://www.postgresql.org/docs/16/sql-createschema.html",
  },
  {
    kwd: "CREATE SEQUENCE",
    docs: "define a new sequence generator",
    url: "https://www.postgresql.org/docs/16/sql-createsequence.html",
  },
  {
    kwd: "CREATE SERVER",
    docs: "define a new foreign server",
    url: "https://www.postgresql.org/docs/16/sql-createserver.html",
  },
  {
    kwd: "CREATE STATISTICS",
    docs: "define extended statistics",
    url: "https://www.postgresql.org/docs/16/sql-createstatistics.html",
  },
  {
    kwd: "CREATE SUBSCRIPTION",
    docs: "define a new subscription",
    url: "https://www.postgresql.org/docs/16/sql-createsubscription.html",
  },
  {
    kwd: "CREATE TABLE",
    docs: "define a new table",
    url: "https://www.postgresql.org/docs/16/sql-createtable.html",
  },
  {
    kwd: "CREATE TABLE AS",
    docs: "define a new table from the results of a query",
    url: "https://www.postgresql.org/docs/16/sql-createtableas.html",
  },
  {
    kwd: "CREATE TABLESPACE",
    docs: "define a new tablespace",
    url: "https://www.postgresql.org/docs/16/sql-createtablespace.html",
  },
  {
    kwd: "CREATE TEXT SEARCH CONFIGURATION",
    docs: "define a new text search configuration",
    url: "https://www.postgresql.org/docs/16/sql-createtsconfig.html",
  },
  {
    kwd: "CREATE TEXT SEARCH DICTIONARY",
    docs: "define a new text search dictionary",
    url: "https://www.postgresql.org/docs/16/sql-createtsdictionary.html",
  },
  {
    kwd: "CREATE TEXT SEARCH PARSER",
    docs: "define a new text search parser",
    url: "https://www.postgresql.org/docs/16/sql-createtsparser.html",
  },
  {
    kwd: "CREATE TEXT SEARCH TEMPLATE",
    docs: "define a new text search template",
    url: "https://www.postgresql.org/docs/16/sql-createtstemplate.html",
  },
  {
    kwd: "CREATE TRANSFORM",
    docs: "define a new transform",
    url: "https://www.postgresql.org/docs/16/sql-createtransform.html",
  },
  {
    kwd: "CREATE TRIGGER",
    docs: "define a new trigger",
    url: "https://www.postgresql.org/docs/16/sql-createtrigger.html",
  },
  {
    kwd: "CREATE TYPE",
    docs: "define a new data type",
    url: "https://www.postgresql.org/docs/16/sql-createtype.html",
  },
  {
    kwd: "CREATE USER",
    docs: "define a new database role",
    url: "https://www.postgresql.org/docs/16/sql-createuser.html",
  },
  {
    kwd: "CREATE USER MAPPING",
    docs: "define a new mapping of a user to a foreign server",
    url: "https://www.postgresql.org/docs/16/sql-createusermapping.html",
  },
  {
    kwd: "CREATE VIEW",
    docs: "define a new view",
    url: "https://www.postgresql.org/docs/16/sql-createview.html",
  },
  {
    kwd: "DEALLOCATE",
    docs: "deallocate a prepared statement",
    url: "https://www.postgresql.org/docs/16/sql-deallocate.html",
  },
  {
    kwd: "DECLARE",
    docs: "define a cursor",
    url: "https://www.postgresql.org/docs/16/sql-declare.html",
  },
  {
    kwd: "DELETE",
    docs: "delete rows of a table",
    url: "https://www.postgresql.org/docs/16/sql-delete.html",
  },
  {
    kwd: "DISCARD",
    docs: "discard session state",
    url: "https://www.postgresql.org/docs/16/sql-discard.html",
  },
  {
    kwd: "DO",
    docs: "execute an anonymous code block",
    url: "https://www.postgresql.org/docs/16/sql-do.html",
  },
  {
    kwd: "DROP ACCESS METHOD",
    docs: "remove an access method",
    url: "https://www.postgresql.org/docs/16/sql-drop-access-method.html",
  },
  {
    kwd: "DROP AGGREGATE",
    docs: "remove an aggregate function",
    url: "https://www.postgresql.org/docs/16/sql-dropaggregate.html",
  },
  {
    kwd: "DROP CAST",
    docs: "remove a cast",
    url: "https://www.postgresql.org/docs/16/sql-dropcast.html",
  },
  {
    kwd: "DROP COLLATION",
    docs: "remove a collation",
    url: "https://www.postgresql.org/docs/16/sql-dropcollation.html",
  },
  {
    kwd: "DROP CONVERSION",
    docs: "remove a conversion",
    url: "https://www.postgresql.org/docs/16/sql-dropconversion.html",
  },
  {
    kwd: "DROP DATABASE",
    docs: "remove a database",
    url: "https://www.postgresql.org/docs/16/sql-dropdatabase.html",
  },
  {
    kwd: "DROP DOMAIN",
    docs: "remove a domain",
    url: "https://www.postgresql.org/docs/16/sql-dropdomain.html",
  },
  {
    kwd: "DROP EVENT TRIGGER",
    docs: "remove an event trigger",
    url: "https://www.postgresql.org/docs/16/sql-dropeventtrigger.html",
  },
  {
    kwd: "DROP EXTENSION",
    docs: "remove an extension",
    url: "https://www.postgresql.org/docs/16/sql-dropextension.html",
  },
  {
    kwd: "DROP FOREIGN DATA WRAPPER",
    docs: "remove a foreign-data wrapper",
    url: "https://www.postgresql.org/docs/16/sql-dropforeigndatawrapper.html",
  },
  {
    kwd: "DROP FOREIGN TABLE",
    docs: "remove a foreign table",
    url: "https://www.postgresql.org/docs/16/sql-dropforeigntable.html",
  },
  {
    kwd: "DROP FUNCTION",
    docs: "remove a function",
    url: "https://www.postgresql.org/docs/16/sql-dropfunction.html",
  },
  {
    kwd: "DROP GROUP",
    docs: "remove a database role",
    url: "https://www.postgresql.org/docs/16/sql-dropgroup.html",
  },
  {
    kwd: "DROP INDEX",
    docs: "remove an index",
    url: "https://www.postgresql.org/docs/16/sql-dropindex.html",
  },
  {
    kwd: "DROP LANGUAGE",
    docs: "remove a procedural language",
    url: "https://www.postgresql.org/docs/16/sql-droplanguage.html",
  },
  {
    kwd: "DROP MATERIALIZED VIEW",
    docs: "remove a materialized view",
    url: "https://www.postgresql.org/docs/16/sql-dropmaterializedview.html",
  },
  {
    kwd: "DROP OPERATOR",
    docs: "remove an operator",
    url: "https://www.postgresql.org/docs/16/sql-dropoperator.html",
  },
  {
    kwd: "DROP OPERATOR CLASS",
    docs: "remove an operator class",
    url: "https://www.postgresql.org/docs/16/sql-dropopclass.html",
  },
  {
    kwd: "DROP OPERATOR FAMILY",
    docs: "remove an operator family",
    url: "https://www.postgresql.org/docs/16/sql-dropopfamily.html",
  },
  {
    kwd: "DROP OWNED",
    docs: "remove database objects owned by a database role",
    url: "https://www.postgresql.org/docs/16/sql-drop-owned.html",
  },
  {
    kwd: "DROP POLICY",
    docs: "remove a row-level security policy from a table",
    url: "https://www.postgresql.org/docs/16/sql-droppolicy.html",
  },
  {
    kwd: "DROP PROCEDURE",
    docs: "remove a procedure",
    url: "https://www.postgresql.org/docs/16/sql-dropprocedure.html",
  },
  {
    kwd: "DROP PUBLICATION",
    docs: "remove a publication",
    url: "https://www.postgresql.org/docs/16/sql-droppublication.html",
  },
  {
    kwd: "DROP ROLE",
    docs: "remove a database role",
    url: "https://www.postgresql.org/docs/16/sql-droprole.html",
  },
  {
    kwd: "DROP ROUTINE",
    docs: "remove a routine",
    url: "https://www.postgresql.org/docs/16/sql-droproutine.html",
  },
  {
    kwd: "DROP RULE",
    docs: "remove a rewrite rule",
    url: "https://www.postgresql.org/docs/16/sql-droprule.html",
  },
  {
    kwd: "DROP SCHEMA",
    docs: "remove a schema",
    url: "https://www.postgresql.org/docs/16/sql-dropschema.html",
  },
  {
    kwd: "DROP SEQUENCE",
    docs: "remove a sequence",
    url: "https://www.postgresql.org/docs/16/sql-dropsequence.html",
  },
  {
    kwd: "DROP SERVER",
    docs: "remove a foreign server descriptor",
    url: "https://www.postgresql.org/docs/16/sql-dropserver.html",
  },
  {
    kwd: "DROP STATISTICS",
    docs: "remove extended statistics",
    url: "https://www.postgresql.org/docs/16/sql-dropstatistics.html",
  },
  {
    kwd: "DROP SUBSCRIPTION",
    docs: "remove a subscription",
    url: "https://www.postgresql.org/docs/16/sql-dropsubscription.html",
  },
  {
    kwd: "DROP TABLE",
    docs: "remove a table",
    url: "https://www.postgresql.org/docs/16/sql-droptable.html",
  },
  {
    kwd: "DROP TABLESPACE",
    docs: "remove a tablespace",
    url: "https://www.postgresql.org/docs/16/sql-droptablespace.html",
  },
  {
    kwd: "DROP TEXT SEARCH CONFIGURATION",
    docs: "remove a text search configuration",
    url: "https://www.postgresql.org/docs/16/sql-droptsconfig.html",
  },
  {
    kwd: "DROP TEXT SEARCH DICTIONARY",
    docs: "remove a text search dictionary",
    url: "https://www.postgresql.org/docs/16/sql-droptsdictionary.html",
  },
  {
    kwd: "DROP TEXT SEARCH PARSER",
    docs: "remove a text search parser",
    url: "https://www.postgresql.org/docs/16/sql-droptsparser.html",
  },
  {
    kwd: "DROP TEXT SEARCH TEMPLATE",
    docs: "remove a text search template",
    url: "https://www.postgresql.org/docs/16/sql-droptstemplate.html",
  },
  {
    kwd: "DROP TRANSFORM",
    docs: "remove a transform",
    url: "https://www.postgresql.org/docs/16/sql-droptransform.html",
  },
  {
    kwd: "DROP TRIGGER",
    docs: "remove a trigger",
    url: "https://www.postgresql.org/docs/16/sql-droptrigger.html",
  },
  {
    kwd: "DROP TYPE",
    docs: "remove a data type",
    url: "https://www.postgresql.org/docs/16/sql-droptype.html",
  },
  {
    kwd: "DROP USER",
    docs: "remove a database role",
    url: "https://www.postgresql.org/docs/16/sql-dropuser.html",
  },
  {
    kwd: "DROP USER MAPPING",
    docs: "remove a user mapping for a foreign server",
    url: "https://www.postgresql.org/docs/16/sql-dropusermapping.html",
  },
  {
    kwd: "DROP VIEW",
    docs: "remove a view",
    url: "https://www.postgresql.org/docs/16/sql-dropview.html",
  },
  {
    kwd: "END",
    docs: "commit the current transaction",
    url: "https://www.postgresql.org/docs/16/sql-end.html",
  },
  {
    kwd: "EXECUTE",
    docs: "execute a prepared statement",
    url: "https://www.postgresql.org/docs/16/sql-execute.html",
  },
  {
    kwd: "EXPLAIN",
    docs: "show the execution plan of a statement",
    url: "https://www.postgresql.org/docs/16/sql-explain.html",
  },
  {
    kwd: "FETCH",
    docs: "retrieve rows from a query using a cursor",
    url: "https://www.postgresql.org/docs/16/sql-fetch.html",
  },
  {
    kwd: "GRANT",
    docs: "define access privileges",
    url: "https://www.postgresql.org/docs/16/sql-grant.html",
  },
  {
    kwd: "IMPORT FOREIGN SCHEMA",
    docs: "import table definitions from a foreign server",
    url: "https://www.postgresql.org/docs/16/sql-importforeignschema.html",
  },
  {
    kwd: "INSERT",
    docs: "create new rows in a table",
    url: "https://www.postgresql.org/docs/16/sql-insert.html",
  },
  {
    kwd: "LISTEN",
    docs: "listen for a notification",
    url: "https://www.postgresql.org/docs/16/sql-listen.html",
  },
  {
    kwd: "LOAD",
    docs: "load a shared library file",
    url: "https://www.postgresql.org/docs/16/sql-load.html",
  },
  {
    kwd: "LOCK",
    docs: "lock a table",
    url: "https://www.postgresql.org/docs/16/sql-lock.html",
  },
  {
    kwd: "MERGE",
    docs: "conditionally insert, update, or delete rows of a table",
    url: "https://www.postgresql.org/docs/16/sql-merge.html",
  },
  {
    kwd: "MOVE",
    docs: "position a cursor",
    url: "https://www.postgresql.org/docs/16/sql-move.html",
  },
  {
    kwd: "NOTIFY",
    docs: "generate a notification",
    url: "https://www.postgresql.org/docs/16/sql-notify.html",
  },
  {
    kwd: "PREPARE",
    docs: "prepare a statement for execution",
    url: "https://www.postgresql.org/docs/16/sql-prepare.html",
  },
  {
    kwd: "PREPARE TRANSACTION",
    docs: "prepare the current transaction for two-phase commit",
    url: "https://www.postgresql.org/docs/16/sql-prepare-transaction.html",
  },
  {
    kwd: "REASSIGN OWNED",
    docs: "change the ownership of database objects owned by a database role",
    url: "https://www.postgresql.org/docs/16/sql-reassign-owned.html",
  },
  {
    kwd: "REFRESH MATERIALIZED VIEW",
    docs: "replace the contents of a materialized view",
    url: "https://www.postgresql.org/docs/16/sql-refreshmaterializedview.html",
  },
  {
    kwd: "REINDEX",
    docs: "rebuild indexes",
    url: "https://www.postgresql.org/docs/16/sql-reindex.html",
  },
  {
    kwd: "RELEASE SAVEPOINT",
    docs: "release a previously defined savepoint",
    url: "https://www.postgresql.org/docs/16/sql-release-savepoint.html",
  },
  {
    kwd: "RESET",
    docs: "restore the value of a run-time parameter to the default value",
    url: "https://www.postgresql.org/docs/16/sql-reset.html",
  },
  {
    kwd: "REVOKE",
    docs: "remove access privileges",
    url: "https://www.postgresql.org/docs/16/sql-revoke.html",
  },
  {
    kwd: "ROLLBACK",
    docs: "abort the current transaction",
    url: "https://www.postgresql.org/docs/16/sql-rollback.html",
  },
  {
    kwd: "ROLLBACK PREPARED",
    docs: "cancel a transaction that was earlier prepared for two-phase commit",
    url: "https://www.postgresql.org/docs/16/sql-rollback-prepared.html",
  },
  {
    kwd: "ROLLBACK TO SAVEPOINT",
    docs: "roll back to a savepoint",
    url: "https://www.postgresql.org/docs/16/sql-rollback-to.html",
  },
  {
    kwd: "SAVEPOINT",
    docs: "define a new savepoint within the current transaction",
    url: "https://www.postgresql.org/docs/16/sql-savepoint.html",
  },
  {
    kwd: "SECURITY LABEL",
    docs: "define or change a security label applied to an object",
    url: "https://www.postgresql.org/docs/16/sql-security-label.html",
  },
  {
    kwd: "SELECT",
    docs: "retrieve rows from a table or view",
    url: "https://www.postgresql.org/docs/16/sql-select.html",
  },
  {
    kwd: "SELECT INTO",
    docs: "define a new table from the results of a query",
    url: "https://www.postgresql.org/docs/16/sql-selectinto.html",
  },
  {
    kwd: "SET",
    docs: "change a run-time parameter",
    url: "https://www.postgresql.org/docs/16/sql-set.html",
  },
  {
    kwd: "SET CONSTRAINTS",
    docs: "set constraint check timing for the current transaction",
    url: "https://www.postgresql.org/docs/16/sql-set-constraints.html",
  },
  {
    kwd: "SET ROLE",
    docs: "set the current user identifier of the current session",
    url: "https://www.postgresql.org/docs/16/sql-set-role.html",
  },
  {
    kwd: "SET SESSION AUTHORIZATION",
    docs: "set the session user identifier and the current user identifier of the current session",
    url: "https://www.postgresql.org/docs/16/sql-set-session-authorization.html",
  },
  {
    kwd: "SET TRANSACTION",
    docs: "set the characteristics of the current transaction",
    url: "https://www.postgresql.org/docs/16/sql-set-transaction.html",
  },
  {
    kwd: "SHOW",
    docs: "show the value of a run-time parameter",
    url: "https://www.postgresql.org/docs/16/sql-show.html",
  },
  {
    kwd: "START TRANSACTION",
    docs: "start a transaction block",
    url: "https://www.postgresql.org/docs/16/sql-start-transaction.html",
  },
  {
    kwd: "TRUNCATE",
    docs: "empty a table or set of tables",
    url: "https://www.postgresql.org/docs/16/sql-truncate.html",
  },
  {
    kwd: "UNLISTEN",
    docs: "stop listening for a notification",
    url: "https://www.postgresql.org/docs/16/sql-unlisten.html",
  },
  {
    kwd: "UPDATE",
    docs: "update rows of a table",
    url: "https://www.postgresql.org/docs/16/sql-update.html",
  },
  {
    kwd: "VACUUM",
    docs: "garbage-collect and optionally analyze a database",
    url: "https://www.postgresql.org/docs/16/sql-vacuum.html",
  },
  {
    kwd: "VALUES",
    docs: "compute a set of rows",
    url: "https://www.postgresql.org/docs/16/sql-values.html",
  },
] as const;
