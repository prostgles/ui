import { spawn } from "child_process";

export const compileSchemaConfigProject = (configPath: string) =>
  new Promise<void>((resolve, reject) => {
    let tscPath: string;
    try {
      tscPath = require.resolve("typescript/bin/tsc", {
        paths: [configPath],
      });
    } catch {
      reject(
        new Error(
          `TypeScript is not installed in config project ${configPath}. Run npm install in that project.`,
        ),
      );
      return;
    }
    const child = spawn(process.execPath, [tscPath, "--project", configPath], {
      cwd: configPath,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) return resolve();
      reject(new Error(`tsc exited code=${code} signal=${signal}`));
    });
  });
