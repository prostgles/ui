import React from "react";
import { CodeEditor } from "../dashboard/CodeEditor/CodeEditor";

type P = {
  platform:
    | "aix"
    | "darwin"
    | "freebsd"
    | "linux"
    | "openbsd"
    | "sunos"
    | "win32";
};

export const PostgresInstallInstructions = ({ platform }: P) => {
  const linux = [
    "sudo apt install postgresql postgresql-contrib",
    "sudo -su postgres createuser -P --superuser ui ",
    "sudo -su postgres createdb -O ui prostgles-ui-state",
  ];
  const Linux = <CodeEditor language="bash" value={linux.join("\n")} />;

  return Linux;
};
