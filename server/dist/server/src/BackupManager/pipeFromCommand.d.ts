/// <reference types="node" />
/// <reference types="node" />
import child from 'child_process';
import internal from "stream";
export type EnvVars = Record<string, string> | {};
export declare const envToStr: (vars: EnvVars) => string;
export declare function pipeFromCommand(args: {
    command: string;
    opts: string[];
    envVars: EnvVars;
    destination: internal.Writable;
    onEnd: (err: any | undefined, fullLog: string) => void;
    onStdout?: (data: {
        full: any;
        chunk: any;
        pipedLength: number;
    }, isStdErr?: boolean) => void;
    useExec?: boolean;
    onChunk?: (chunk: any, streamSize: number) => void;
}): child.ChildProcess;
//# sourceMappingURL=pipeFromCommand.d.ts.map