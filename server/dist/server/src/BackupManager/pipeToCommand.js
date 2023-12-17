"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipeToCommand = void 0;
const child_process_1 = __importDefault(require("child_process"));
const pipeFromCommand_1 = require("./pipeFromCommand");
const pipeToCommand = (command, opts, envVars = {}, source, onEnd, onStdout, useExec = false) => {
    const execCommand = `${(0, pipeFromCommand_1.envToStr)(envVars)} ${command} ${opts.join(" ")}`;
    const env = !envVars ? undefined : envVars;
    const proc = useExec ? child_process_1.default.exec(execCommand) : child_process_1.default.spawn(command, opts, { env });
    let log;
    let fullLog = "";
    proc.stderr.on('data', (data) => {
        log = data.toString();
        fullLog += log;
        onStdout?.({ full: fullLog, chunk: log }, true);
    });
    proc.stdout.on('data', (data) => {
        const log = data.toString();
        fullLog += log;
        onStdout?.({ full: fullLog, chunk: log });
    });
    proc.stdout.on('error', function (err) {
        onEnd(err ?? "proc.stdout 'error'");
    });
    proc.stdin.on('error', function (err) {
        onEnd(err ?? "proc.stdin 'error'");
    });
    proc.on('error', function (err) {
        onEnd(err ?? "proc 'error'");
    });
    source.pipe(proc.stdin);
    proc.on('exit', function (code, signal) {
        const err = fullLog.split("\n").at(-1);
        if (code) {
            console.error({ execCommandErr: err });
            source.destroy();
        }
        onEnd?.(code ? (err ?? "Error") : undefined);
    });
    return proc;
};
exports.pipeToCommand = pipeToCommand;
//# sourceMappingURL=pipeToCommand.js.map