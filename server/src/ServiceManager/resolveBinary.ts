import { execSync } from "node:child_process";
import { EOL } from "node:os";

type BinaryName = "docker";
export const resolveBinary = (name: BinaryName) => {
  if (process.platform !== "win32") return name;
  try {
    const result = execSync(`where ${name}`, { encoding: "utf8" })
      .trim()
      .split(EOL)[0]
      ?.trim();
    if (!result) throw new Error(`Binary not found: ${name}`);
    return result;
  } catch {
    throw new Error(`Cannot find binary: ${name}`);
  }
};
