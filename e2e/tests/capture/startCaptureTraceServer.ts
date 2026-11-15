import { execFile, spawn } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import type { CaptureScene } from "./getCaptureSceneUtils";

export const startCaptureTraceServer = async (
  tracePath: string,
  scenes: CaptureScene[],
  renderDirectory: string,
) => {
  const cliPath = join(
    dirname(require.resolve("playwright/package.json")),
    "cli.js",
  );
  await mkdir(renderDirectory, { recursive: true });
  await promisify(execFile)(
    process.execPath,
    [cliPath, "trace", "open", tracePath],
    { cwd: renderDirectory },
  );
  const trace = await readFile(
    join(renderDirectory, ".playwright-cli/trace/trace.trace"),
    "utf8",
  );
  const events = trace
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as TraceEvent);
  const snapshotScenes = scenes.map((scene) => {
    const group = events.find(
      (event) => event.type === "before" && event.title === scene.name,
    );
    const action =
      group?.type === "before" ?
        events.find(
          (event) =>
            event.type === "before" &&
            event.parentId === group.callId &&
            event.method === "waitForSelector",
        )
      : undefined;
    if (
      action?.type !== "before" ||
      !events.some(
        (event) =>
          event.type === "frame-snapshot" &&
          event.snapshot.callId === action.callId &&
          event.snapshot.phase === "after",
      )
    ) {
      throw new Error(`Missing trace snapshot for ${scene.name}`);
    }
    return { ...scene, callId: action.callId };
  });
  const [firstScene] = snapshotScenes;
  if (!firstScene) throw new Error("No capture scenes to record");

  const server = spawn(
    process.execPath,
    [
      cliPath,
      "trace",
      "snapshot",
      firstScene.callId,
      "--phase",
      "after",
      "--serve",
    ],
    { cwd: renderDirectory, stdio: ["ignore", "pipe", "pipe"] },
  );
  const closed = new Promise<void>((resolve) =>
    server.once("close", () => resolve()),
  );
  const stop = async () => {
    server.kill();
    await closed;
  };
  let errors = "";
  server.stderr.on("data", (chunk: Buffer) => {
    errors += chunk.toString();
  });
  const lines = createInterface({ input: server.stdout });
  try {
    const origin = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Trace server startup timed out")),
        30_000,
      );
      const finish = (error: Error | undefined, url?: string) => {
        clearTimeout(timeout);
        if (error) reject(error);
        else if (url) resolve(url);
      };
      server.once("error", (error) => finish(error));
      server.once("exit", () =>
        finish(new Error(`Trace server exited: ${errors}`)),
      );
      lines.on("line", (line) => {
        const prefix = "Serving snapshot at ";
        if (line.startsWith(prefix))
          finish(undefined, line.slice(prefix.length));
      });
    });
    return { origin, scenes: snapshotScenes, stop };
  } catch (error) {
    await stop();
    throw error;
  } finally {
    lines.close();
  }
};

type TraceEvent =
  | {
      type: "before";
      callId: string;
      method: string;
      title: string | undefined;
      parentId: string | undefined;
    }
  | {
      type: "frame-snapshot";
      snapshot: { callId: string; phase: string };
    };
