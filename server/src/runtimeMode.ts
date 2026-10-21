import { getEntries } from "@common/utils";
import path from "node:path";

const rootFile = require.main?.filename;

const ROOT_FILES = {
  cli: [require.resolve("./cliServer")],
  electron: [
    path.resolve(__dirname, "../../../../..", "build/main.js"),
    path.resolve(__dirname, "../../../..", "electron/build/main.js"),
  ],
  "electron-test": [require.resolve("./testElectron")],
  default: [require.resolve("./index")],
};

const mode = getEntries(ROOT_FILES).find(([_, files]) =>
  files.some((file) => rootFile === file),
)?.[0];

if (!mode) {
  throw new Error(`Unknown runtime mode for main file: ${rootFile}`);
}

export const RUNTIME_MODE = mode;
