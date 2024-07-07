import type { DB } from "prostgles-server/dist/Prostgles";
import type { ProstglesInitState } from "../../../commonTypes/electronInit";
type OS = "Windows" | "Linux" | "Mac" | "";
export type InstalledPrograms = ProstglesInitState["canDumpAndRestore"] & {
    os: OS;
    filePath: string;
} | undefined;
export declare const getInstalledPrograms: (db: DB) => Promise<InstalledPrograms>;
export {};
//# sourceMappingURL=getInstalledPrograms.d.ts.map