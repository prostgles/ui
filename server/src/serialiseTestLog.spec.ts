import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { EventInfo } from "prostgles-server/dist/Logging";
import {
  serialiseTestLog,
  shouldLogTestEvent,
} from "./serialiseTestLog";
import { getTestLogFiles } from "./testLogFiles";

void test("test logs retain sync, trigger, connection and transaction events", () => {
  const events = [
    { type: "sync", command: "syncData", state: "syncBatch.start" },
    { type: "sync", command: "replicationError" },
    { type: "syncOrSub", command: "notifListener" },
    { type: "syncOrSub", command: "notifListener.Finished" },
    { type: "syncOrSub", command: "refreshTriggers" },
    { type: "connect" },
    { type: "disconnect" },
    { type: "debug", command: "DboBuilder.onCommit" },
    { type: "debug", command: "DboBuilder.onRollback" },
  ] as EventInfo[];

  for (const event of events) {
    const logged = JSON.parse(serialiseTestLog(event, "connection-id"));
    assert.equal(logged.connection_id, "connection-id");
    assert.ok(Number.isFinite(Date.parse(logged.created)));
    for (const [key, value] of Object.entries(event)) {
      assert.equal(logged[key], value);
    }
  }
});

void test("test logs exclude runtime objects without losing request data or errors", () => {
  const runtime = {
    toJSON: () => {
      throw new Error("Runtime objects must not be serialized");
    },
  };
  const event = {
    type: "table",
    command: "insert",
    tableName: "windows",
    data: { rowOrRows: { table_name: "users" } },
    error: new Error("Insert failed"),
    localParams: runtime,
    txInfo: runtime,
    syncParams: runtime,
  } as unknown as EventInfo;
  const logged = JSON.parse(serialiseTestLog(event, null));
  assert.equal(logged.localParams, undefined);
  assert.equal(logged.txInfo, undefined);
  assert.equal(logged.syncParams, undefined);
  assert.equal(logged.loggedEvent, undefined);
  assert.deepEqual(logged.data, { rowOrRows: { table_name: "users" } });
  assert.equal(logged.error.message, "Insert failed");
  assert.match(logged.error.stack, /Insert failed/);
});

void test("test logs preserve trigger maps and handle circular data and bigint", () => {
  const triggers = new Map([
    ["windows", new Map([[3, { condition: "workspace_id = 'workspace-id'" }]])],
  ]);
  const data: Record<string, unknown> = { last_updated: 1790290590661n };
  data.circular = data;
  const logged = JSON.parse(serialiseTestLog(
    {
      type: "syncOrSub",
      command: "refreshTriggers",
      triggers,
      oldTriggers: new Map(),
      data,
    } as unknown as EventInfo,
    null,
  ));
  assert.equal(
    logged.triggers.windows[3].condition,
    "workspace_id = 'workspace-id'",
  );
  assert.deepEqual(logged.oldTriggers, {});
  assert.equal(logged.data.last_updated, "1790290590661");
  assert.equal(logged.data.circular, "[Circular]");
});

void test("test logs retain sync context and exclude successful noise", () => {
  const keep = [
    { type: "sync", command: "syncData" },
    { type: "syncOrSub", command: "notifListener" },
    { type: "table", command: "insert" },
    { type: "table", command: "subscribe" },
    { type: "connect" },
    { type: "disconnect" },
    { type: "debug", command: "DboBuilder.onCommit" },
    { type: "table", command: "find", error: new Error("failed") },
  ];
  const exclude = [
    { type: "debug", command: "DboBuilder.getTablesForSchemaPostgresSQL" },
    { type: "debug", command: "pushSocketSchema" },
    { type: "table", command: "find" },
    { type: "table", command: "getInfo" },
    { type: "method" },
    { type: "auth" },
  ];

  keep.forEach((event) =>
    assert.equal(shouldLogTestEvent(event as EventInfo), true),
  );
  exclude.forEach((event) =>
    assert.equal(shouldLogTestEvent(event as EventInfo), false),
  );
});

void test("test log paths only match the active log and numeric archives", () => {
  const files = getTestLogFiles("/project/logs/test-events.log");
  assert.equal(files.getArchivePath(2), "/project/logs/test-events.2.log");
  ["test-events.log", "test-events.1.log", "test-events.12.log"].forEach(
    (fileName) => assert.equal(files.isManagedFileName(fileName), true),
  );
  [
    "test-events.log.1",
    "test-events.postgres.log",
    "test-events.other.log",
    "other.1.log",
  ].forEach((fileName) =>
    assert.equal(files.isManagedFileName(fileName), false),
  );
  assert.throws(() => getTestLogFiles("/project/logs/test-events"), /\.log/);
});
