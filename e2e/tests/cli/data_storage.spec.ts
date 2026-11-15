import { cpSync, existsSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { getFileServePath } from "../../../common/utils";
import { expect, test } from "../utils/fixtures";
import { createConfigTestProject } from "../utils/createConfigTestProject";
import type { createTestDeployment } from "../../../server/dist/server/src/testing";

test("CLI data survives package replacement and rejects package-local storage", async ({ page }) => {
  const serverPath = resolve(__dirname, "../../../server");
  const packagePath = test.info().outputPath("runtime/node_modules/@prostgles/app");
  const install = () => {
    cpSync(join(serverPath, "dist"), join(packagePath, "dist"), { recursive: true });
    for (const directory of ["src", "node_modules", "client", "sample_schemas"]) {
      symlinkSync(join(serverPath, directory), join(packagePath, directory), "dir");
    }
  };
  install();
  const configPath = createConfigTestProject({
    id: "persistent-storage-e2e",
    databaseConfig: {
      file_table_config: { fileTable: "files", storageType: { type: "local" } },
    },
  }, test.info().outputPath("config"));
  const runtime = require(join(packagePath, "dist/server/src/testing")) as {
    createTestDeployment: typeof createTestDeployment;
  };
  const deployment = await runtime.createTestDeployment({
    configPath,
    configId: "persistent-storage-e2e",
    logPath: test.info().outputPath("storage-server.log"),
  });
  try {
    const client = await deployment.connectProjectAs("admin");
    const pdf = readFileSync(join(__dirname, "../testAskLLM/sample.pdf"));
    const file = await client.db.files!.insert!(
      { data: pdf, original_name: "persistent.pdf" }, { returning: "*" },
    );
    const state = await deployment.connectStateAs("admin");
    const connection = (await state.db.connections!.findOne({ name: "persistent-storage-e2e" }))!;
    const storagePath = join(configPath, ".prostgles/data/prostgles_storage");
    expect(existsSync(storagePath)).toBe(true);
    expect(existsSync(join(packagePath, "prostgles_storage"))).toBe(false);
    await page.context().addCookies(deployment.storageStateAs("admin").cookies);
    const url = deployment.endpoint + getFileServePath({ connectionId: connection.id, fileId: file.id });
    const download = async () => {
      // Schema watching can briefly unmount the file route after startup.
      await expect(async () => {
        const response = await page.request.get(url);
        expect(response.status()).toBe(200);
        expect(await response.body()).toEqual(pdf);
      }).toPass({ timeout: 10_000 });
    };
    await download();
    // npm replaces the installed package, leaving project-owned data intact.
    rmSync(packagePath, { recursive: true });
    install();
    expect(await client.db.files!.findOne!({ id: file.id })).toMatchObject({ id: file.id });
    await download();
  } finally {
    await deployment.dispose();
  }

  // Use the real CLI runtime mode to probe startup paths without a database.
  const entry = join(packagePath, "dist/server/src/cliServer.js");
  writeFileSync(entry, `console.log(require('./electronConfig').getDataPath('STORAGE'));`);
  const probe = (dataDir: string) => spawnSync(process.execPath, [entry], {
    cwd: serverPath,
    encoding: "utf8",
    env: { ...process.env, PROSTGLES_UI_CONFIG: configPath, PROSTGLES_DATA_DIR: dataDir },
  });
  const defaultPath = probe("");
  expect(defaultPath.status, defaultPath.stderr).toBe(0);
  expect(defaultPath.stdout.trim()).toBe(join(configPath, ".prostgles/data/prostgles_storage"));
  const customPath = test.info().outputPath("persistent-volume");
  expect(probe(customPath).stdout.trim()).toBe(join(customPath, "prostgles_storage"));
  const unsafePaths = [join(packagePath, "data"), test.info().outputPath("linked-package/data")];
  symlinkSync(packagePath, test.info().outputPath("linked-package"), "dir");
  for (const unsafePath of unsafePaths) {
    const result = probe(unsafePath);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Unsafe Prostgles data path");
    expect(existsSync(unsafePath)).toBe(false);
  }
});
