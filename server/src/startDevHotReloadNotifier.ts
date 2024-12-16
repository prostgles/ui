import path from "path";
import * as fs from "fs";
import type { InitResult } from "prostgles-server/dist/initProstgles";
import { RELOAD_NOTIFICATION } from "../../commonTypes/utils";

let showedMessage = false;
export const startDevHotReloadNotifier = ({
  io,
  port,
  host,
}: {
  io: InitResult["io"];
  port: number;
  host: string;
}) => {
  const showMessage = () => {
    if (showedMessage) return;
    console.log(`\n\n${RELOAD_NOTIFICATION}:\n\n http://${host}:${port}`);
    showedMessage = true;
  };
  if (process.env.NODE_ENV === "development") {
    fs.watchFile(
      path.join(__dirname, "../../../../client/configs/last_compiled.txt"),
      { interval: 100 },
      (eventType, filename) => {
        io.emit("server-restart-request");
        showMessage();
      },
    );
  } else {
    showMessage();
  }
};
