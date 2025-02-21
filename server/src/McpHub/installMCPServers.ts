import * as fs from "fs";
import * as path from "path";
import { getErrorAsObject } from "prostgles-server/dist/DboBuilder/dboBuilderUtils";
import { simpleGit, type SimpleGit } from "simple-git";
import type { DBS } from "..";
import { DefaultMCPServers } from "../../../commonTypes/mcp";
import { getRootDir } from "../electronConfig";
import { runShellCommand } from "./runShellCommand";

const MCP_DIR = path.resolve(path.join(getRootDir(), `/prostgles_mcp`));
const MCP_SERVERS_DIR = path.join(MCP_DIR, "servers");

export const installMCPServers = async (dbs: DBS, reInstall?: boolean) => {
  const logTypeFilter = { id: "mcp_install" };
  await dbs.mcp_install_logs.delete(logTypeFilter);
  let log = `${reInstall ? "Re-installing" : "Installing"} MCP servers`;
  const addLog = (logChunk: string, finished = false, error?: string) => {
    log += `\n${logChunk}`;
    return dbs.mcp_install_logs.update(logTypeFilter, {
      log,
      error,
      finished: finished ? new Date() : undefined,
      last_updated: new Date(),
    });
  };
  await dbs.mcp_install_logs.insert({
    ...logTypeFilter,
    log,
  });
  if (reInstall) {
    try {
      await addLog("Removing existing MCP servers folder...");
      fs.rmSync(MCP_SERVERS_DIR, { recursive: true });
    } catch (err) {
      await addLog(
        "Failed to remove existing MCP servers folder: " +
          JSON.stringify(getErrorAsObject(err)),
      );
    }
  }
  await addLog("Creating MCP servers folder...");
  fs.mkdirSync(MCP_DIR, { recursive: true });
  await addLog("Cloning MCP servers...");
  const res1 = await runShellCommand(
    "git",
    ["clone", "https://github.com/modelcontextprotocol/servers.git"],
    { cwd: MCP_DIR },
    (chunk) => addLog(chunk),
  );
  if (res1.err) {
    return addLog("Failed to clone MCP servers.", true, res1.err);
  }
  await addLog("MCP servers cloned\nInstalling MCP servers...");
  const res2 = await runShellCommand(
    "npm",
    ["install"],
    { cwd: MCP_SERVERS_DIR },
    (chunk) => addLog(chunk),
  );
  if (res2.err) {
    return addLog("Failed to install MCP servers", true, res2.err);
  }

  await dbs.mcp_servers.delete();
  await dbs.mcp_servers.insert(
    Object.entries(DefaultMCPServers).map(([name, server]) => ({
      name,
      cwd: `${MCP_SERVERS_DIR}/src/${name}`,
      ...server,
    })),
  );
  await addLog("MCP servers installed", true);
};

export const getMCPServersStatus = async (): Promise<{
  ok: boolean;
  message?: string;
}> => {
  const folderExists = fs.existsSync(MCP_SERVERS_DIR);
  if (!folderExists) {
    return { ok: false, message: "No MCP servers installed" };
  }
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
};
