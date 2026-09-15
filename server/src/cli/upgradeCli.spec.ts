import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  applyCliUpgradeFiles,
  getCliUpgradeConflicts,
  parseFileAction,
} from "./upgradeCli";

void test("file actions accept one-letter shortcuts, full names and defaults", () => {
  assert.equal(parseFileAction("s", ["skip", "write"], "write"), "skip");
  assert.equal(parseFileAction("w", ["skip", "write"], "write"), "write");
  assert.equal(
    parseFileAction("m", ["skip", "merge", "overwrite"], "merge"),
    "merge",
  );
  assert.equal(
    parseFileAction("o", ["skip", "merge", "overwrite"], "merge"),
    "overwrite",
  );
  assert.equal(
    parseFileAction("OVERWRITE", ["skip", "merge", "overwrite"], "merge"),
    "overwrite",
  );
  assert.equal(parseFileAction("", ["skip", "write"], "write"), "write");
  assert.equal(parseFileAction("x", ["skip", "write"], "write"), undefined);
});

void test("upgrade prompts per file with defaults and respects every action", async (context) => {
  const root = mkdtempSync(join(tmpdir(), "prostgles-upgrade-test-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const incoming = join(root, "incoming");
  const target = join(root, "target");
  mkdirSync(incoming);
  mkdirSync(target);
  const actions = {
    "new-write": "write",
    "new-skip": "skip",
    "existing-skip": "skip",
    "existing-merge": "merge",
    "existing-overwrite": "overwrite",
  } as const;
  for (const name of Object.keys(actions)) {
    writeFileSync(join(incoming, name), "incoming");
    if (name.startsWith("existing")) writeFileSync(join(target, name), "local");
  }
  for (const directory of [incoming, target])
    writeFileSync(join(directory, "identical"), "same");
  writeFileSync(join(target, "app-only"), "custom");
  mkdirSync(join(incoming, "nested"));
  writeFileSync(join(incoming, "nested", "new-write"), "incoming");
  const prompted: string[] = [];
  const merged: string[] = [];
  await applyCliUpgradeFiles(
    incoming,
    target,
    (file, choices, defaultAction) => {
      const name = file.split("/").at(-1)!;
      prompted.push(file);
      const isNew = name.startsWith("new");
      assert.deepEqual(
        choices,
        isNew ? ["skip", "write"] : ["skip", "merge", "overwrite"],
      );
      assert.equal(defaultAction, isNew ? "write" : "merge");
      return Promise.resolve(actions[name as keyof typeof actions]);
    },
    (local, remote) => {
      assert.equal(readFileSync(local, "utf8"), "local");
      assert.equal(readFileSync(remote, "utf8"), "incoming");
      merged.push(local);
      writeFileSync(local, "resolved");
    },
  );
  assert.equal(prompted.length, 6);
  assert.deepEqual(merged, [join(target, "existing-merge")]);
  assert.equal(
    readFileSync(join(target, "existing-merge"), "utf8"),
    "resolved",
  );
  assert.equal(readFileSync(join(target, "existing-skip"), "utf8"), "local");
  assert.equal(
    readFileSync(join(target, "existing-overwrite"), "utf8"),
    "incoming",
  );
  assert.equal(readFileSync(join(target, "new-write"), "utf8"), "incoming");
  assert.equal(
    readFileSync(join(target, "nested", "new-write"), "utf8"),
    "incoming",
  );
  assert.equal(existsSync(join(target, "new-skip")), false);
  assert.equal(readFileSync(join(target, "app-only"), "utf8"), "custom");
});

void test("inline conflicts separate changed sections and preserve shared lines", (context) => {
  const root = mkdtempSync(join(tmpdir(), "prostgles-conflicts-test-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const local = join(root, "local");
  const incoming = join(root, "incoming");
  writeFileSync(local, "header\nold\nshared\nold2\nfooter\n");
  writeFileSync(incoming, "header\nnew\nshared\nnew2\nfooter\n");
  assert.equal(
    getCliUpgradeConflicts(local, incoming),
    "header\n<<<<<<< Current\nold\n=======\nnew\n>>>>>>> Incoming\nshared\n<<<<<<< Current\nold2\n=======\nnew2\n>>>>>>> Incoming\nfooter\n",
  );
  assert.equal(
    readFileSync(local, "utf8"),
    "header\nold\nshared\nold2\nfooter\n",
  );
});

void test("inline conflicts handle additions, removals, empty files and line endings", (context) => {
  const root = mkdtempSync(join(tmpdir(), "prostgles-conflicts-test-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  const local = join(root, "local");
  const incoming = join(root, "incoming");
  const conflict = (before: string, after: string, newline = "\n") =>
    `<<<<<<< Current${newline}${before}=======${newline}${after}>>>>>>> Incoming${newline}`;
  for (const [before, after, expected] of [
    ["same\n", "added\nsame\n", conflict("", "added\n") + "same\n"],
    ["same\n", "same\nadded\n", "same\n" + conflict("", "added\n")],
    ["removed\nsame\n", "same\n", conflict("removed\n", "") + "same\n"],
    ["same\nremoved\n", "same\n", "same\n" + conflict("removed\n", "")],
    ["", "added\n", conflict("", "added\n")],
    ["removed\n", "", conflict("removed\n", "")],
    ["old", "new", conflict("old\n", "new\n")],
    ["@@ old\n", "@@ new\n", conflict("@@ old\n", "@@ new\n")],
    [
      "same\r\nold\r\n",
      "same\r\nnew\r\n",
      "same\r\n" + conflict("old\r\n", "new\r\n", "\r\n"),
    ],
    ["same", "same", "same"],
  ]) {
    writeFileSync(local, before!);
    writeFileSync(incoming, after!);
    assert.equal(getCliUpgradeConflicts(local, incoming), expected);
  }
});
