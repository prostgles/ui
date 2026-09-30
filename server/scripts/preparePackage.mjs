import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import "./copyCliDockerfiles.mjs";

const source = resolve(import.meta.dirname, "../../client");
const destination = resolve(import.meta.dirname, "../client");

if (!existsSync(resolve(source, "build"))) {
  throw new Error("Client build is missing");
}

rmSync(destination, { recursive: true, force: true });
mkdirSync(destination, { recursive: true });
cpSync(resolve(source, "build"), resolve(destination, "build"), {
  recursive: true,
});
cpSync(resolve(source, "static"), resolve(destination, "static"), {
  recursive: true,
});
