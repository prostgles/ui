import path from "path";
import * as fs from "fs";
import type { InitResult } from "prostgles-server/dist/initProstgles";
import { RELOAD_NOTIFICATION } from "@common/utils";

let showedMessage = false;
export const startDevHotReloadNotifier = ({
  io,
  port,
  host,
}: {
  io: NonNullable<InitResult["io"]>;
  port: number;
  host: string;
}) => {
  console.log("startDevHotReloadNotifier. Starting dev hot reload notifier");
  const showMessage = () => {
    if (showedMessage) return;
    console.log(`\n\n${RELOAD_NOTIFICATION}:\n\n http://${host}:${port}`);
    showedMessage = true;
  };
  if (process.env.NODE_ENV === "development") {
    const lastCompiledPath = path.join(
      __dirname,
      "../../../../../client/configs/last_compiled.txt",
    );
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.watchFile(lastCompiledPath, { interval: 100 }, (eventType, filename) => {
      io.emit("server-restart-request");
      showMessage();
    });
  } else {
    showMessage();
  }
};
