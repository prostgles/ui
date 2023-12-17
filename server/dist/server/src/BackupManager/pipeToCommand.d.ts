/// <reference types="node" />
import child from 'child_process';
import internal from "stream";
import { EnvVars } from "./pipeFromCommand";
export declare const pipeToCommand: (command: string, opts: string[], envVars: EnvVars | undefined, source: internal.Readable, onEnd: (err?: any) => void, onStdout?: ((data: {
    full: any;
    chunk: any;
}, isStdErr?: boolean) => void) | undefined, useExec?: boolean) => child.ChildProcess;
//# sourceMappingURL=pipeToCommand.d.ts.map