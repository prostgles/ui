import { spawn, spawnSync } from "node:child_process";
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
import { cliFileNames } from "./cliFileNames";

type FileAction = "skip" | "write" | "merge" | "overwrite";
type ChooseFileAction = (
  file: string,
  choices: readonly FileAction[],
  defaultAction: FileAction,
) => Promise<FileAction>;
type MergeFiles = (local: string, incoming: string) => void | Promise<void>;

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
      "--ignore-space-at-eol",
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

export const mergeWithVSCode = async (local: string, incoming: string) => {
  const original = readFileSync(local);
  const conflicts = getCliUpgradeConflicts(local, incoming);
  writeFileSync(local, conflicts);
  try {
    await new Promise<void>((resolve, reject) => {
      const editor = spawn("code", ["--wait", local], { stdio: "inherit" });
      const onInterrupt = () => editor.kill("SIGINT");
      const cleanup = () => process.off("SIGINT", onInterrupt);
      process.once("SIGINT", onInterrupt);
      editor.once("error", (error) => {
        cleanup();
        reject(
          new Error(
            "Could not open VS Code. Ensure the code command is on PATH.",
            {
              cause: error,
            },
          ),
        );
      });
      editor.once("exit", (status, signal) => {
        cleanup();
        if (status === 0) {
          resolve();
          return;
        }
        reject(
          new Error(
            signal ?
              `VS Code exited with signal ${signal}`
            : `VS Code exited with status ${status ?? 1}`,
          ),
        );
      });
    });
  } catch (error) {
    writeFileSync(local, original);
    throw error;
  }
};

export const applyCliUpgradeFiles = async (
  incomingPath: string,
  targetPath: string,
  chooseAction: ChooseFileAction,
  merge: MergeFiles = mergeWithVSCode,
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
    } else if (entry.name === cliFileNames.dbGeneratedSchema) {
      continue;
    } else if (fileContentsDiffer(target, incoming)) {
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
        await merge(target, incoming);
      }
    }
  }
};

const fileContentsDiffer = (currentPath: string, incomingPath: string) => {
  const current = readFileSync(currentPath);
  const incoming = readFileSync(incomingPath);
  if (current.equals(incoming)) return false;
  return !withoutFinalNewline(current).equals(withoutFinalNewline(incoming));
};

const withoutFinalNewline = (contents: Buffer) => {
  if (contents.at(-1) !== 10) return contents;
  return contents.subarray(0, contents.at(-2) === 13 ? -2 : -1);
};

export const upgradeCli = async (configId: string, targetPath: string) => {
  const incomingPath = mkdtempSync(join(tmpdir(), "prostgles-upgrade-"));
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const environmentExample = join(
      targetPath,
      cliFileNames.environmentExample,
    );
    const environmentDefaults =
      existsSync(environmentExample) ?
        parse(readFileSync(environmentExample))
      : undefined;
    const targetPackage = JSON.parse(
      readFileSync(join(targetPath, cliFileNames.packageJson), "utf8"),
    ) as { dependencies?: Record<string, unknown> };
    const runtimeDependency = targetPackage.dependencies?.["@prostgles/app"];
    await saveCliTemplateFiles({
      configId,
      targetPath: incomingPath,
      environmentDefaults,
      formatConfigPath: targetPath,
      runtimeDependency:
        typeof runtimeDependency === "string" ? runtimeDependency : undefined,
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
