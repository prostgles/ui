import assert from "node:assert/strict";
import test from "node:test";
import {
  appendClientLog,
  createClientLogBuffer,
  getClientLogBytes,
} from "../src/pages/ProjectConnection/clientLogBuffer.ts";

test("client logs discard the oldest entries when byte capped", () => {
  const first = JSON.stringify({ id: 1, data: "first" });
  const second = JSON.stringify({ id: 2, data: "second" });
  const limits = {
    maxBytes: getClientLogBytes(second),
    maxEntries: 10,
  };
  const buffer = createClientLogBuffer([], limits);

  appendClientLog(buffer, first, limits);
  appendClientLog(buffer, second, limits);

  assert.deepEqual(buffer.logs, [JSON.parse(second)]);
  assert.equal(buffer.bytes, getClientLogBytes(second));
});

test("client logs discard the oldest entries when count capped", () => {
  const limits = { maxBytes: 1_000, maxEntries: 2 };
  const buffer = createClientLogBuffer([{ id: 1 }, { id: 2 }], limits);

  appendClientLog(buffer, JSON.stringify({ id: 3 }), limits);

  assert.deepEqual(buffer.logs, [{ id: 2 }, { id: 3 }]);
});

test("client logs discard entries larger than the byte cap", () => {
  const limits = { maxBytes: 5, maxEntries: 10 };
  const buffer = createClientLogBuffer([], limits);

  appendClientLog(buffer, JSON.stringify({ data: "too large" }), limits);

  assert.deepEqual(buffer.logs, []);
  assert.equal(buffer.bytes, 0);
});
