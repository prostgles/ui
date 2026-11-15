import { readFileSync } from "fs";
import { join } from "path";

export { onMount } from "./onMount";
export { default as connection } from "./connection";
export { default as databaseConfig } from "./databaseConfig";
export { workspaceConfig } from "./workspaceConfig";
export const onInitSQL = readFileSync(join(__dirname, "../onInit.sql"), "utf8");
