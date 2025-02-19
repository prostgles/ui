import * as path from "path";
import * as fs from "fs";
import { getRootDir } from "../electronConfig";
import { execSync } from "child_process";
import { simpleGit, type SimpleGit, CleanOptions } from "simple-git";

const MCP_DIR = path.resolve(path.join(getRootDir(), `/prostgles_mcp`));
const MCP_SERVERS_DIR = path.join(MCP_DIR, "servers");

export const installMCPServers = () => {
  // fs.mkdirSync(MCP_DIR, { recursive: true });
  // const git: SimpleGit = simpleGit(MCP_DIR); //.clean(CleanOptions.FORCE);
  // git.clone(
  //   "https://github.com/modelcontextprotocol/servers.git",
  //   MCP_SERVERS_DIR,
  // );
  // // execSync(
  // //   `git clone https://github.com/modelcontextprotocol/servers.git ${MCP_SERVERS_DIR}`,
  // // );
  // execSync(`npm install`, { cwd: MCP_SERVERS_DIR });
  // // execSync(`npm run build`, { cwd: destination });
};

export const getMCPServersStatus = async (): Promise<
  | {
      ok: boolean;
      message?: string;
    }
  | any
> => {
  // const folderExists = fs.existsSync(MCP_SERVERS_DIR);
  // if (!folderExists) {
  //   return { ok: false, message: "No MCP servers installed" };
  // }
  // const git: SimpleGit = simpleGit(MCP_DIR); //.clean(CleanOptions.FORCE);
  // // const status = execSync("git status", { cwd: MCP_SERVERS_DIR });
  // const status = await git.status();
  // if (status.behind > 0) {
  //   return {
  //     ok: false,
  //     message: `Repository is behind by ${status.behind} commits`,
  //   };
  // } else {
  //   return {
  //     ok: true,
  //     message: `Repository is up to date`,
  //   };
  // }
};
