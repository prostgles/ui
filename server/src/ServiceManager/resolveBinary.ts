import { execFileSync } from "node:child_process";
import { EOL } from "node:os";
import { includes } from "prostgles-types";

type BinaryName = "docker";
const { platform } = process;
export const resolveBinary = (named: BinaryName): string => {
  const name = named;
  const lookupCmd = platform === "win32" ? "where" : "which";

  try {
    const out = execFileSync(lookupCmd, [name], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });

    const first = out.split(EOL).find(Boolean)?.trim();
    if (!first) throw new Error();

    return first;
  } catch {
    throw new Error(
      installationMarkdownHints[name][
        includes(["darwin", "win32", "linux"] as const, platform) ? platform : (
          "linux"
        )
      ] || `${name} is not installed or not found in PATH.`,
    );
  }
};

const installationMarkdownHints: Record<
  BinaryName,
  Record<"darwin" | "win32" | "linux", string>
> = {
  docker: {
    darwin: `Docker is not installed. Please follow the official [installation instructions](https://docs.docker.com/desktop/setup/install/mac-install/)`,
    win32: `Docker is not installed. Please follow the official [installation instructions](https://docs.docker.com/desktop/setup/install/windows-install/)`,
    linux: `Docker is not installed. Please follow the official [installation instructions](https://docs.docker.com/engine/install/).`,
  },
};
