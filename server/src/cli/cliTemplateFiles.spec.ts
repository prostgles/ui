import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { saveCliComposeFiles, saveCliTemplateFiles } from "./cliTemplateFiles";

void test("new CLI apps include a native Compose deployment", (context) => {
  const targetPath = mkdtempSync(join(tmpdir(), "prostgles-cli-template-"));
  context.after(() => rmSync(targetPath, { force: true, recursive: true }));

  saveCliTemplateFiles({ configId: "my-app", targetPath });

  const compose = readFileSync(join(targetPath, "compose.yaml"), "utf8");
  const dockerfile = readFileSync(join(targetPath, "Dockerfile"), "utf8");
  const generatedPackage = JSON.parse(
    readFileSync(join(targetPath, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  assert.match(compose, /^name: my-app$/m);
  assert.match(compose, /^ {2}app:$/m);
  assert.match(compose, /^ {2}db:$/m);
  assert.match(
    compose,
    /PROSTGLES_DOCKER_NETWORK: \$\{PROSTGLES_DOCKER_NETWORK:-my-app-runtime\}/,
  );
  assert.match(
    compose,
    /PROSTGLES_INSTANCE_ID: \$\{PROSTGLES_INSTANCE_ID:-my-app\}/,
  );
  assert.match(compose, /\/var\/run\/docker\.sock:\/var\/run\/docker\.sock/);
  assert.match(
    compose,
    /^ {4}name: \$\{PROSTGLES_DOCKER_NETWORK:-my-app-runtime\}$/m,
  );
  assert.ok(dockerfile.includes("AS runtime"));
  assert.ok(dockerfile.includes("FROM runtime AS app"));
  assert.ok(!dockerfile.includes("prostgles/ui-runtime"));
  assert.ok(compose.includes("dockerfile: DB.Dockerfile"));
  assert.ok(
    readFileSync(join(targetPath, "DB.Dockerfile"), "utf8").includes("procps"),
  );
  assert.ok(compose.includes("shared_preload_libraries=pg_stat_statements"));
  assert.ok(compose.includes("max_connections=200"));
  assert.equal(
    generatedPackage.scripts.upgrade,
    "prostgles upgrade --config .",
  );
});

void test("CLI templates can preserve environment example secrets", (context) => {
  const targetPath = mkdtempSync(join(tmpdir(), "prostgles-cli-env-"));
  context.after(() => rmSync(targetPath, { force: true, recursive: true }));

  saveCliTemplateFiles({
    configId: "my-app",
    targetPath,
    environmentDefaults: {
      PRGL_PASSWORD: "existing-admin-password",
      PROSTGLES_DOCKER_DB_PASSWORD: "existing-database-password",
    },
  });

  const environmentExample = readFileSync(
    join(targetPath, ".env.example"),
    "utf8",
  );
  assert.match(environmentExample, /^PRGL_PASSWORD=existing-admin-password$/m);
  assert.match(
    environmentExample,
    /^PROSTGLES_DOCKER_DB_PASSWORD=existing-database-password$/m,
  );
});

void test("compose init does not overwrite deployment files", (context) => {
  const targetPath = mkdtempSync(join(tmpdir(), "prostgles-compose-init-"));
  context.after(() => rmSync(targetPath, { force: true, recursive: true }));
  writeFileSync(join(targetPath, "Dockerfile"), "custom\n");

  assert.throws(
    () => saveCliComposeFiles({ configId: "my-app", targetPath }),
    /Refusing to overwrite existing deployment files: Dockerfile/,
  );
  assert.equal(
    readFileSync(join(targetPath, "Dockerfile"), "utf8"),
    "custom\n",
  );
});
