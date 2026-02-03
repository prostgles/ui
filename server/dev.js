#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");
const net = require("net");
const { once } = require("events");

let nodeProcess = null;
let rebuilding = false;
let pending = false;

const tsc = spawn("tsc", ["-w"], { stdio: ["ignore", "pipe", "pipe"] });

tsc.stdout.on("data", (data) => handleTscOutput(data.toString()));
tsc.stderr.on("data", (data) => process.stderr.write(data));

tsc.on("exit", (code) => {
  console.error(`tsc exited with code ${code}`);
  process.exit(code);
});

function handleTscOutput(text) {
  process.stdout.write(text);
  if (
    text.includes("Found 0 errors.") &&
    text.includes("Watching for file changes")
  ) {
    queueRebuild();
  }
}

function queueRebuild() {
  if (rebuilding) {
    pending = true;
    return;
  }
  debounceRebuild();
}

async function rebuild() {
  rebuilding = true;

  await runAlias();
  await restartNode();

  rebuilding = false;
  if (pending) {
    pending = false;
    rebuild();
  }
}

const DEBOUNCE_MS = 100;
let debounceTimer = null;
function debounceRebuild() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(rebuild, DEBOUNCE_MS);
}

function runAlias() {
  return new Promise((resolve) => {
    const alias = spawn("tsc-alias", ["-p", "tsconfig.json"], {
      stdio: "inherit",
    });
    alias.on("exit", resolve);
  });
}

async function restartNode() {
  if (nodeProcess) await stopNode();
  await waitForPortFree(3004);

  nodeProcess = spawn(
    "node",
    [
      "--inspect=9229",
      "--trace-warnings",
      path.resolve("dist/server/src/index.js"),
    ],
    { stdio: "inherit" },
  );
}

async function stopNode() {
  nodeProcess.kill("SIGTERM");

  // wait for clean exit, then force kill if needed
  await Promise.race([
    once(nodeProcess, "exit"),
    new Promise((res) =>
      setTimeout(() => {
        nodeProcess.kill("SIGKILL");
        res();
      }, 1000),
    ),
  ]);

  nodeProcess = null;
}

function waitForPortFree(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const check = () => {
      const srv = net
        .createServer()
        .once("error", () => setTimeout(check, 50))
        .once("listening", () => srv.close(resolve))
        .listen(port, host);
    };
    check();
  });
}
