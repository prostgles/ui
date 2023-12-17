 
import child from 'child_process';
import internal from "stream"; 
import { envToStr, EnvVars } from "./pipeFromCommand";

export const pipeToCommand = (
  command: string, 
  opts: string[], 
  envVars: EnvVars = {},
  source: internal.Readable, 
  onEnd: (err?: any)=>void, 
  onStdout?: (data: { full: any; chunk: any; }, isStdErr?: boolean) =>void,
  useExec = false
) => {

  const execCommand = `${envToStr(envVars)} ${command} ${opts.join(" ")}`;
  const env: NodeJS.ProcessEnv | undefined = !envVars? undefined : envVars;
  const proc = useExec? child.exec(execCommand) : child.spawn(command, opts as any, { env });
  let log: string;
  let fullLog = "";
  proc.stderr!.on('data', (data) => {
    log = data.toString();
    fullLog += log;
    onStdout?.({ full: fullLog, chunk: log }, true);
  });
  proc.stdout!.on('data', (data) => {
    const log = data.toString();
    fullLog += log;
    onStdout?.({ full: fullLog, chunk: log })
  });
  proc.stdout!.on('error', function (err) {
    onEnd(err ?? "proc.stdout 'error'")
  });
  proc.stdin!.on('error', function (err) {
    onEnd(err ?? "proc.stdin 'error'")
  });
  proc.on('error', function (err) {
    onEnd(err ?? "proc 'error'")
  });
  
  source.pipe(proc.stdin!);

  proc.on('exit', function (code, signal) {
    const err = fullLog.split("\n").at(-1);
    if(code){
      console.error({ execCommandErr: err })
      source.destroy();
    }
    
    onEnd?.(code? (err ?? "Error") : undefined);
  });

  return proc;
}