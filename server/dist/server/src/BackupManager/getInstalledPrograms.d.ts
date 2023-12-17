import { DB } from "prostgles-server/dist/Prostgles";
import { ProstglesInitState } from "../../../commonTypes/electronInit";
export type InstalledPrograms = ProstglesInitState["canDumpAndRestore"] & {
    windowsOpts: {
        path: string;
        ext: string;
    };
} | undefined;
export declare const getInstalledPrograms: (db: DB) => Promise<InstalledPrograms>;
//# sourceMappingURL=getInstalledPrograms.d.ts.map