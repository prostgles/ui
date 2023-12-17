
 
import path from 'path';
import * as fs from "fs";
import { InitResult } from "prostgles-server/dist/initProstgles";

let showedMessage = false;
export const startDevHotReloadNotifier = ({ io, port }: { io: InitResult["io"]; port: number }) => {
  const showMessage = () => {
    if(showedMessage) return
    console.log(`\n\nProstgles UI accessible at:\n\n http://localhost:${port}`);
    showedMessage = true
  }
  if(process.env.NODE_ENV === "development"){
    fs.watchFile(path.join(__dirname, "../../../../client/configs/last_compiled.txt"), { interval: 100 }, (eventType, filename) => {
      io.emit("pls-restart");
      showMessage();
    });
  } else {
    showMessage();
  }
}