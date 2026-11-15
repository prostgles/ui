import { spawn } from "child_process";
import { validateConfigModules } from "../cli/getConfigModuleErrors";
import { logTimedStep } from "../utils/logTimedStep";

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
    const finishCompilation = logTimedStep("Compiling config TypeScript");
    const child = spawn(process.execPath, [tscPath, "--project", configPath], {
      cwd: configPath,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code === 0) {
        try {
          finishCompilation();
          const finishValidation = logTimedStep("Validating config modules");
          validateConfigModules(configPath);
          finishValidation();
          resolve();
        } catch (error) {
          reject(error);
        }
        return;
      }
      reject(new Error(`tsc exited code=${code} signal=${signal}`));
    });
  });
