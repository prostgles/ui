import { strict } from "assert";
import { test } from "node:test";
import { getConnectionDetails, type Connections } from "./getConnectionDetails";

const getDetails = (db_conn: string) =>
  getConnectionDetails({
    type: "Connection URI",
    db_conn,
    db_host: "fallback-host",
    db_port: 5432,
  } as Connections);

void test("parses a PostgreSQL Unix-socket URI with an unescaped host query parameter", () => {
  const details = getDetails(
    "postgresql://socket_user:secret@/socket_db?host=/var/run/postgresql&sslmode=disable",
  );

  strict.equal(details.host, "/var/run/postgresql");
  strict.equal(details.port, 5432);
  strict.equal(details.user, "socket_user");
  strict.equal(details.password, "secret");
  strict.equal(details.database, "socket_db");
});

void test("parses a PostgreSQL Unix-socket URI with an encoded host query parameter", () => {
  const details = getDetails(
    "postgresql://socket_user:secret@/socket_db?host=%2Fvar%2Frun%2Fpostgresql&port=5433&sslmode=disable",
  );

  strict.equal(details.host, "/var/run/postgresql");
  strict.equal(details.port, 5433);
});
