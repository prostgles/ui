"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipeFromCommand = exports.envToStr = void 0;
const child_process_1 = __importDefault(require("child_process"));
const prostgles_types_1 = require("prostgles-types");
const envToStr = (vars) => {
    return (0, prostgles_types_1.getKeys)(vars).map(k => `${k}=${JSON.stringify(vars[k])}`).join(" ") + " ";
};
exports.envToStr = envToStr;
function pipeFromCommand(args) {
    const { useExec = false, envVars = {}, onEnd, command, destination, opts, onStdout, onChunk } = args;
    const execCommand = `${(0, exports.envToStr)(envVars)} ${command} ${opts.join(" ")}`;
    const env = envVars;
    const proc = useExec ? child_process_1.default.exec(execCommand) : child_process_1.default.spawn(command, opts, { env });
    const getUTFText = (v) => v.toString(); //.replaceAll(/[^\x00-\x7F]/g, ""); //.replaceAll("\\", "[escaped backslash]");   // .replaceAll("\\u0000", "");
    let fullLog = "";
    // const lastSent = Date.now();
    let log;
    let streamSize = 0;
    proc.stderr.on("data", (data) => {
        log = getUTFText(data);
        fullLog += log;
        // const now = Date.now();
        // if(lastSent > now - 1000){
        /** These are the pg_dump logs */
        onStdout?.({ full: fullLog, chunk: log, pipedLength: streamSize }, true);
        // }
    });
    proc.stdout.on("data", (data) => {
        streamSize += data.length;
        /** These is the pg_dump actual data */
        onChunk?.(data, streamSize);
        // onStdout?.({ chunk: getUTFText(data), full: fullLog });
    });
    proc.stdout.on("error", function (err) {
        onEnd(err, fullLog);
    });
    proc.stdin.on("error", function (err) {
        onEnd(err, fullLog);
    });
    proc.on("error", function (err) {
        onEnd(err, fullLog);
    });
    proc.stdout.pipe(destination, { end: false });
    proc.on("exit", function (code, signal) {
        if (code) {
            console.error({ execCommandErr: fullLog.slice(fullLog.length - 100) });
            onEnd(log, fullLog);
        }
        else {
            onEnd(undefined, fullLog);
            destination.end();
        }
    });
    return proc;
}
exports.pipeFromCommand = pipeFromCommand;
//# sourceMappingURL=pipeFromCommand.js.map