import * as fs from "fs";
import * as path from "path";
import { simpleGit, type SimpleGit } from "simple-git";
import type { DBS } from "..";
import { DefaultMCPServers } from "../../../commonTypes/mcp";
import { getRootDir } from "../electronConfig";
import { runShellCommand } from "./runShellCommand";
import { getEntries } from "../../../commonTypes/utils";

let createdMCPDirectory = "";
export const getMCPDirectory = () => {
  if (!createdMCPDirectory) {
    const MCP_DIR = path.resolve(path.join(getRootDir(), `/prostgles_mcp`));
    fs.mkdirSync(MCP_DIR, { recursive: true });
    createdMCPDirectory = MCP_DIR;
  }
  return createdMCPDirectory;
};

const getMCPServerInstallationPath = (name: string) => {
  const installationPath = path.join(getMCPDirectory(), name);
  return installationPath;
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
  let log = "Installing MCP server";
  let firstError: string | undefined;
  const addLog = (logChunk: string, error?: string) => {
    firstError ??= error;
    log += `\n${logChunk}`;
    return dbs.mcp_server_logs.update(logTypeFilter, {
      install_log: log,
      install_error: error,
      last_updated: new Date(),
    });
  };

  try {
    await dbs.mcp_server_logs.insert({
      ...logTypeFilter,
      log,
    });

    await addLog("Creating MCP servers folder...");
    if (source.type === "github") {
      throw new Error("Not implemented");
      // await addLog("Cloning MCP servers...");
      // const res1 = await runShellCommand(
      //   "git",
      //   ["clone", source.repoUrl],
      //   { cwd: MCP_DIR },
      //   (chunk) => addLog(chunk),
      // );
      // if (res1.err) {
      //   return addLog("Failed to clone MCP servers.", true, res1.err);
      // }
      // await addLog("MCP servers cloned\nInstalling MCP servers...");

      // const res2 = await runShellCommand(
      //   "npm",
      //   ["install"],
      //   { cwd: MCP_DIR },
      //   (chunk) => addLog(chunk),
      // );
      // if (res2.err) {
      //   return addLog("Failed to install MCP servers", true, res2.err);
      // }
    } else {
      const installationPath = getMCPServerInstallationPath(name);
      if (fs.existsSync(installationPath)) {
        await addLog("MCP servers already installed. Reinstalling...");
        fs.rmSync(installationPath, { recursive: true });
      }
      fs.mkdirSync(installationPath, { recursive: true });
      const { packageJson, tsconfigJson, indexTs } = source;
      for (const [fileName, content] of getEntries({
        "package.json": packageJson,
        "tsconfig.json": tsconfigJson,
        "index.ts": indexTs,
      })) {
        let destination = path.join(installationPath, fileName);
        if (fileName === "index.ts") {
          destination = path.join(installationPath, "src", fileName);
          fs.mkdirSync(path.join(installationPath, "src"), { recursive: true });
        }
        fs.writeFileSync(destination, content, "utf-8");
      }
      const npmI = await runShellCommand(
        "npm",
        ["install"],
        { cwd: installationPath },
        (chunk) => {
          void addLog(chunk);
        },
      );
      if (npmI.err) {
        await addLog(
          "Failed to install MCP server",
          npmI.err instanceof Error ? npmI.err.message : npmI.err,
        );
      } else {
        await addLog(npmI.fullLog);
      }
    }
  } catch (error) {
    await addLog(
      "Failed to install MCP server",
      error instanceof Error ? error.message : String(error),
    );
  }

  if (firstError === undefined) {
    await dbs.mcp_servers.update(
      {
        name,
      },
      {
        installed: new Date(),
      },
    );
    await addLog(`MCP server ${JSON.stringify(name)} installed`);
  }
};

export const getMCPServersStatus = async (
  dbs: DBS,
  serverName: string,
): Promise<{
  ok: boolean;
  message?: string;
}> => {
  const folderExists = fs.existsSync(getMCPDirectory());
  if (!folderExists) {
    return { ok: false, message: "No MCP servers installed" };
  }
  const serverInfo = DefaultMCPServers[serverName];
  if (!serverInfo) {
    throw new Error("Server not found");
  }
  const source = serverInfo.source;
  if (!source) {
    return { ok: false, message: `Installation not required` };
  }
  const server = await dbs.mcp_servers.findOne({ name: serverName });
  const cwd = server?.cwd;
  if (!cwd) return { ok: false, message: `Server cwd missing` };

  const installationPath = getMCPServerInstallationPath(serverName);
  if (source.type === "github") {
    const git: SimpleGit = simpleGit(installationPath);
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

  const wasInstalled = fs.existsSync(installationPath);

  return wasInstalled ?
      { ok: true }
    : { ok: false, message: `Server not installed` };
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
