import * as fs from "fs";
import * as path from "path";
import { type AnyObject, isDefined, isEqual, pickKeys } from "prostgles-types";
import { simpleGit, type SimpleGit } from "simple-git";
import type { DBS } from "..";
import { DefaultMCPServers } from "../../../commonTypes/mcp";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import { getRootDir } from "../electronConfig";
import { runShellCommand } from "./runShellCommand";

export const MCP_DIR = path.resolve(path.join(getRootDir(), `/prostgles_mcp`));

type MCPSource = NonNullable<DBSSchema["mcp_servers"]["source"]>;
type MCPNpmSource = Extract<MCPSource, { type: "npm package" }>;

const extractTypeUtil = <T extends AnyObject, U extends Partial<T>>(
  t: T,
  u: U,
): Extract<T, U> | undefined => {
  if (isEqual(pickKeys(t, Object.keys(u)), u)) {
    return t as Extract<T, U>;
  }
  return undefined;
};

const getPackageJson = async (dbs: DBS, newServer: MCPNpmSource) => {
  const enabledServers = await dbs.mcp_servers.find({ enabled: true });
  const enabledNpmServers = enabledServers
    .map((s) => extractTypeUtil(s.source, { type: "npm package" } as const))
    .filter(isDefined);

  return {
    name: "prostgles_mcp",
    version: "1.0.0",
    description: "Model Context Protocol Servers",
    dependencies: Object.fromEntries(
      enabledNpmServers
        .concat([newServer])
        .map(({ name, version }) => [name, version || "latest"]),
    ),
  };
};

export const installMCPServer = async (dbs: DBS, name: string) => {
  const serverInfo = DefaultMCPServers[name];
  if (!serverInfo?.source) {
    throw (
      "Server not found. Available servers: " +
      Object.keys(DefaultMCPServers).join(", ")
    );
  }
  const { source } = serverInfo;

  const logTypeFilter = { server_name: name };
  await dbs.mcp_server_logs.delete(logTypeFilter);
  // let log = `${reInstall ? "Re-installing" : "Installing"} MCP servers`;
  let log = "Installing MCP servers";
  const addLog = (logChunk: string, finished = false, error?: string) => {
    log += `\n${logChunk}`;
    return dbs.mcp_server_logs.update(logTypeFilter, {
      install_log: log,
      install_error: error,
      // finished: finished ? new Date() : undefined,
      last_updated: new Date(),
    });
  };

  await dbs.mcp_server_logs.insert({
    ...logTypeFilter,
    log,
  });

  // if (reInstall) {
  //   try {
  //     await addLog("Removing existing MCP servers folder...");
  //     fs.rmSync(MCP_DIR, { recursive: true });
  //   } catch (err) {
  //     await addLog(
  //       "Failed to remove existing MCP servers folder: " +
  //         JSON.stringify(getErrorAsObject(err)),
  //     );
  //   }
  // }
  await addLog("Creating MCP servers folder...");
  fs.mkdirSync(MCP_DIR, { recursive: true });
  if (source.type === "github repo") {
    await addLog("Cloning MCP servers...");
    const res1 = await runShellCommand(
      "git",
      ["clone", source.repoUrl],
      { cwd: MCP_DIR },
      (chunk) => addLog(chunk),
    );
    if (res1.err) {
      return addLog("Failed to clone MCP servers.", true, res1.err);
    }
    await addLog("MCP servers cloned\nInstalling MCP servers...");
  } else if (source.type === "npm package") {
    const pkgJson = await getPackageJson(dbs, source);
    fs.writeFileSync(
      path.join(MCP_DIR, "package.json"),
      JSON.stringify(pkgJson, null, 2),
    );
  } else {
    throw new Error("source type not implemented");
  }

  const res2 = await runShellCommand(
    "npm",
    ["install"],
    { cwd: MCP_DIR },
    (chunk) => addLog(chunk),
  );
  if (res2.err) {
    return addLog("Failed to install MCP servers", true, res2.err);
  }

  await dbs.mcp_servers.update(
    {
      name,
    },
    {
      installed: new Date(),
    },
  );

  await addLog("MCP servers installed", true);
};

export const getMCPServersStatus = async (
  serverName: string,
): Promise<{
  ok: boolean;
  message?: string;
}> => {
  const folderExists = fs.existsSync(MCP_DIR);
  if (!folderExists) {
    return { ok: false, message: "No MCP servers installed" };
  }
  const server = DefaultMCPServers[serverName];
  if (!server) {
    throw new Error("Server not found");
  }
  const source = server.source;

  if (source.type === "npm package") {
    const packageJsonPath = path.join(MCP_DIR, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      return {
        ok: false,
        message: `No package.json found in MCP servers folder`,
      };
    }
    const pkgVersion = await runShellCommand(
      "npm",
      ["list", source.name],
      { cwd: MCP_DIR },
      (chunk) => {},
    );
    if (pkgVersion.err) {
      return {
        ok: false,
        message: `MCP servers not installed`,
      };
    }
    if (!pkgVersion.fullLog) {
      return {
        ok: false,
        message: `MCP servers not installed`,
      };
    }
    return {
      ok: true,
      message: `MCP servers installed: ` + pkgVersion.fullLog,
    };
  } else if (source.type === "github repo") {
    const git: SimpleGit = simpleGit(MCP_DIR);
    const status = await git.status();

    return status.behind > 0 ?
        {
          ok: false,
          message: `Repository is behind by ${status.behind} commits`,
        }
      : {
          ok: true,
          message: `Repository is up to date`,
        };
  }

  return { ok: false, message: `source type not implemented` };
};

export const getMcpHostInfo = async () => {
  const platform = process.platform;
  const os = platform === "win32" ? "windows" : platform;
  const npmVersion = await runShellCommand("npm", ["--version"], {}, () => {});
  const uvxVersion = await runShellCommand("git", ["--version"], {}, () => {});
  return {
    os,
    npmVersion: npmVersion.fullLog,
    uvxVersion: uvxVersion.fullLog,
  };
};
