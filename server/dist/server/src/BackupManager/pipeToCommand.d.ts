/// <reference types="node" />
/// <reference types="node" />
import child from "child_process";
import type internal from "stream";
import type { EnvVars } from "./pipeFromCommand";
export declare const pipeToCommand: (command: string, opts: string[], envVars: EnvVars | undefined, source: internal.Readable, onEnd: (err?: any) => void, onStdout?: (data: {
    full: any;
    chunk: any;
}, isStdErr?: boolean) => void, useExec?: boolean) => child.ChildProcess;
//# sourceMappingURL=pipeToCommand.d.ts.map