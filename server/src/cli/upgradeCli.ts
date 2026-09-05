import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { createInterface } from "node:readline/promises";
import { dirname, join } from "node:path";
import { parse } from "dotenv";
import { saveCliTemplateFiles } from "./cliTemplateFiles";

type FileAction = "skip" | "write" | "merge" | "overwrite";
type ChooseFileAction = (
  file: string,
  choices: readonly FileAction[],
  defaultAction: FileAction,
) => Promise<FileAction>;

export const parseFileAction = (
  answer: string,
  choices: readonly FileAction[],
  defaultAction: FileAction,
) => {
  const value = answer.trim().toLowerCase();
  if (!value) return defaultAction;
  const exactMatch = choices.find((choice) => choice === value);
  if (exactMatch) return exactMatch;
  const initialMatches = choices.filter((choice) => choice[0] === value);
  return initialMatches.length === 1 ? initialMatches[0] : undefined;
};

/** Use Git's line diff to offer each changed section as an inline conflict. */
export const getCliUpgradeConflicts = (local: string, incoming: string) => {
  const diff = spawnSync(
    "git",
    [
      "diff",
      "--no-index",
      "--no-ext-diff",
      "--no-textconv",
      "--text",
      "--no-color",
      "--unified=0",
      "--inter-hunk-context=0",
      "--",
      local,
      incoming,
    ],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  if (diff.error)
    throw new Error("Could not compare files. Ensure git is on PATH.", {
      cause: diff.error,
    });
  if (diff.status !== 0 && diff.status !== 1)
    throw new Error(`git diff failed: ${diff.stderr}`);

  const currentText = readFileSync(local, "utf8");
  const currentLines = currentText.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const incomingLines =
    readFileSync(incoming, "utf8").match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const newline = currentText.includes("\r\n") ? "\r\n" : "\n";
  const section = (lines: string[]) => {
    const text = lines.join("");
    return text && !text.endsWith("\n") ? text + newline : text;
  };
  const range = (value: string) => {
    const [start, count = "1"] = value.slice(1).split(",");
    const length = Number(count);
    return { index: Number(start) - (length ? 1 : 0), length };
  };
  let result = "";
  let cursor = 0;
  for (const line of diff.stdout.split("\n")) {
    if (!line.startsWith("@@ -")) continue;
    const newRangeStart = line.indexOf(" +");
    const rangesEnd = line.indexOf(" @@", newRangeStart);
    if (newRangeStart === -1 || rangesEnd === -1) continue;
    const old = range(line.slice(3, newRangeStart));
    const next = range(line.slice(newRangeStart + 1, rangesEnd));
    if (
      !Number.isInteger(old.index) ||
      !Number.isInteger(old.length) ||
      !Number.isInteger(next.index) ||
      !Number.isInteger(next.length)
    ) {
      continue;
    }
    result += currentLines.slice(cursor, old.index).join("");
    result += `<<<<<<< Current${newline}`;
    result += section(currentLines.slice(old.index, old.index + old.length));
    result += `=======${newline}`;
    result += section(
      incomingLines.slice(next.index, next.index + next.length),
    );
    result += `>>>>>>> Incoming${newline}`;
    cursor = old.index + old.length;
  }
  return result + currentLines.slice(cursor).join("");
};

const mergeWithVSCode = (local: string, incoming: string) => {
  const original = readFileSync(local);
  const conflicts = getCliUpgradeConflicts(local, incoming);
  writeFileSync(local, conflicts);
  const result = spawnSync("code", ["--wait", local], { stdio: "inherit" });
  if (result.error) {
    writeFileSync(local, original);
    throw new Error(
      "Could not open VS Code. Ensure the code command is on PATH.",
      { cause: result.error },
    );
  }
  if (result.status !== 0) {
    writeFileSync(local, original);
    throw new Error(`VS Code exited with status ${result.status ?? 1}`);
  }
};

export const applyCliUpgradeFiles = async (
  incomingPath: string,
  targetPath: string,
  chooseAction: ChooseFileAction,
  merge = mergeWithVSCode,
) => {
  for (const entry of readdirSync(incomingPath, { withFileTypes: true })) {
    const incoming = join(incomingPath, entry.name);
    const target = join(targetPath, entry.name);
    if (entry.isDirectory()) {
      await applyCliUpgradeFiles(incoming, target, chooseAction, merge);
      continue;
    }
    if (!existsSync(target)) {
      if (
        (await chooseAction(target, ["skip", "write"], "write")) === "write"
      ) {
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(incoming, target);
        console.log(`Wrote ${target}`);
      }
    } else if (!readFileSync(target).equals(readFileSync(incoming))) {
      const action = await chooseAction(
        target,
        ["skip", "merge", "overwrite"],
        "merge",
      );
      if (action === "overwrite") {
        copyFileSync(incoming, target);
        console.log(`Overwrote ${target}`);
      } else if (action === "merge") {
        console.log(`Merging ${target}`);
        merge(target, incoming);
      }
    }
  }
};

export const upgradeCli = async (configId: string, targetPath: string) => {
  const incomingPath = mkdtempSync(join(tmpdir(), "prostgles-upgrade-"));
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const environmentExample = join(targetPath, ".env.example");
    const environmentDefaults =
      existsSync(environmentExample) ?
        parse(readFileSync(environmentExample))
      : undefined;
    saveCliTemplateFiles({
      configId,
      targetPath: incomingPath,
      environmentDefaults,
    });
    await applyCliUpgradeFiles(
      incomingPath,
      targetPath,
      async (file, choices, defaultAction) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          const shortcuts = choices
            .map((choice) => `${choice[0]}=${choice}`)
            .join("/");
          const answer = await readline.question(
            `${file} [${shortcuts}] (${defaultAction[0]}): `,
          );
          const action = parseFileAction(answer, choices, defaultAction);
          if (action) return action;
          console.log(
            `Choose ${choices.map((choice) => choice[0]).join("/")}.`,
          );
        }
      },
    );
  } finally {
    readline.close();
    rmSync(incomingPath, { recursive: true, force: true });
  }
};
