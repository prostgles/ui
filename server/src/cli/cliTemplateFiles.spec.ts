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
  assert.match(dockerfile, /FROM docker:29-cli AS docker-cli/);
  assert.match(
    dockerfile,
    /COPY --from=docker-cli \/usr\/local\/bin\/docker \/usr\/local\/bin\/docker/,
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
