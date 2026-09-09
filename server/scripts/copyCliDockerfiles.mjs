import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Keep CLI assets beside the compiled CLI in both checkouts and npm packages.
const destination = resolve(import.meta.dirname, "../dist/server/src/cli");
// eslint-disable-next-line security/detect-non-literal-fs-filename
mkdirSync(destination, { recursive: true });
for (const filename of ["Dockerfile", "DB.Dockerfile", ".prettierrc"]) {
  cpSync(
    resolve(import.meta.dirname, "../..", filename),
    resolve(destination, filename),
  );
}
