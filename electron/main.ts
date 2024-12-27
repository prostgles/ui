const unhandled = require("electron-unhandled");
unhandled();
import {
  app,
  screen,
  BrowserWindow,
  safeStorage as ss,
  Tray,
  shell,
  nativeImage,
} from "electron";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
// import { getProtocolHandler } from "./getProtocolHandler";

let localCreds: any;

/**
 * Safe storage encryption works only with a launched browser (electron.launch without "--no-sandbox") and launch without xvfb-run
 * but this does not work within containers
 */
const safeStorage =
  process.env.TEST_MODE === "true" ?
    {
      encryptString: (str: string) => {
        localCreds = str;
        console.log("encryptString", { str });
        return str;
      },
      decryptString: (str: string) => {
        console.log("decryptString", { str, localCreds });
        return localCreds;
      },
    }
  : ss;

const expressApp = require("../ui/server/dist/server/src/electronConfig");
const iconPath = path.join(__dirname, "/../images/icon.ico");

// const protocolHandler = getProtocolHandler({
//   app,
//   expressApp,
// });

/* createSessionSecret */
const electronSid = crypto.randomBytes(48).toString("hex");

/** Limit to single instance */
let mainWindow: BrowserWindow;
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log("Electron multi instance not allowed. Exiting...");
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Tried to run a second instance - focus main window.
    if (mainWindow) {
      /* protocolHandler.onSecondWindow(commandLine); */
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  initApp();
}

function initApp() {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  console.log("Initialising electron app...");

  app.whenReady().then(async () => {
    // let loading = new BrowserWindow({ show: false, frame: false });
    createWindow();

    /** Show loading screen */
    try {
      await mainWindow.loadURL(getLoadingHtml());
    } catch (error) {
      console.error("Failed to load loading screen", error);
    }

    console.log("Electron app ready, starting express server...");
    console.log(
      "State db auth file: " +
        path.resolve(`${app.getPath("userData")}/.electron-auth.json`),
    );

    let port: number;
    expressApp
      .start(
        safeStorage,
        {
          rootDir: app.getPath("userData"),
          port: 0,
          electronSid,
          onSidWasSet: () => {
            console.log("Express server ready, onSidWasSet, reloading...");
            tryOpenBrowser(port ?? 0, electronSid, 0);
          },
          openPath: (path: string, isFile?: boolean) => {
            // Show the given file in a file manager. If possible, select the file.
            if (isFile) {
              shell.showItemInFolder(path);
            } else {
              shell.openPath(path);
            }
          },
        },
        (actualPort: number) => {
          console.log("Express server started on port " + actualPort);
          port = actualPort;
          tryOpenBrowser(actualPort, electronSid);
          // try {
          //   new Tray(nativeImage.createFromPath(iconPath));
          // } catch(error){
          //   console.error("Failed to create tray", error);
          // }

          // app.on('activate', function () {
          //   // On macOS it's common to re-create a window in the app when the
          //   // dock icon is clicked and there are no other windows open.
          //   if (BrowserWindow.getAllWindows().length === 0) {
          //     tryLoadUrl(actualPort, electronSid)
          //   }
          // })
        },
      )
      .catch((err: any) => {
        console.error("Failed to start expressApp.start", err);
      });
  });

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on("window-all-closed", function () {
    if (process.platform !== "darwin") app.quit();
  });

  /* protocolHandler.setOpenUrlListener(); */
}

const createWindow = () => {
  if (mainWindow) return;

  /** Make sure we open it on primary display */
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const desiredHeight = 1000;
  const desiredWidth = 1400;
  const startupWidth = Math.min(desiredWidth, width);
  const startupHeight = Math.min(desiredHeight, height);
  const x = Math.round(primaryDisplay.bounds.x + (width - startupWidth) / 2);
  const y = Math.round(primaryDisplay.bounds.y + (height - startupHeight) / 2);
  mainWindow = new BrowserWindow({
    x,
    y,
    width: startupWidth,
    height: startupHeight,
    icon: iconPath,
  });
  mainWindow.setMenuBarVisibility(false);
};

let mainWindowLoaded: { port: number };
let didSetActivate = false;
const tryOpenBrowser = (port: number, sid: string, delay = 1100) => {
  if (!port) return;
  const url = `http://localhost:${port}`;

  /** 
   * https://github.com/electron/electron/blob/c41b8d536b2d886abbe739374c0a46f99242a894/lib/browser/navigation-controller.ts#L53 
      In some cases the app crashes for (errno: -3):
    {
      errno: -3,
      code: 'ERR_ABORTED',
      url: 'http://localhost:43909/'
    }
    Trace/breakpoint trap (core dumped)
  */
  let tries = 5;
  const tryLoad = async (): Promise<void> => {
    try {
      try {
        await mainWindow.webContents.stop();
      } catch (error) {
        console.error("Failed to mainWindow.webContents.stop: ", error);
      }
      await mainWindow.loadURL(url);
    } catch (error) {
      tries--;
      if (tries > 0) {
        console.error(
          `Failed to mainWindow.loadURL: (${tries} tries left)`,
          error,
        );
        return tryLoad();
      } else {
        console.error("Failed to mainWindow.loadURL: ", error);
        return;
      }
    }

    try {
      new Tray(nativeImage.createFromPath(iconPath));
    } catch (error) {
      console.error("Failed to create tray", error);
    }
    if (didSetActivate) return;
    didSetActivate = true;
    app.on("activate", function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        tryOpenBrowser(port, electronSid);
      }
    });
  };
  console.log("tryLoadUrl", { port });
  createWindow();
  setTimeout(async () => {
    if (port !== mainWindowLoaded?.port) {
      await tryLoad();
    }
    mainWindowLoaded = { port };
    try {
      const ses = mainWindow.webContents.session;
      const cookie = { url, name: "sid_token", value: sid };
      await ses.clearStorageData({ storages: ["cookies"] });
      await ses.cookies.set(cookie);
      console.log("Setting cookie mainWindow.reload");
      mainWindow.reload();
    } catch (error) {
      console.error("Failed to set cookie: ", error);
    }
  }, delay);
};

function getLoadingHtml() {
  const svgLogo = fs.readFileSync(
    path.join(__dirname, "/../images/prostgles-logo-rounded.svg"),
    { encoding: "utf-8" },
  );
  const logoWithoutFirstLine = svgLogo
    .split("\n")
    .slice(1)
    .join("\n")
    .replace(`height="512"`, "")
    .replace(`width="512"`, "");

  const cssAnimation = fs.readFileSync(
    path.join(__dirname, "/../images/loading-effect.css"),
    { encoding: "utf-8" },
  );

  const htmlToDataUrl = (html: string) =>
    "data:text/html;charset=UTF-8," + encodeURIComponent(html);

  return htmlToDataUrl(`
<!DOCTYPE html>
<html lang="en" class="o-hidden">
  <head>

    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
      name="description"
      content=" "
    />
    
    <title>Prostgles Desktop</title>
    <style>
      html, body {
        width: 100%;
        height: 100%;
        text-align: center;
        display: flex;
        flex: 1;
        display: flex;
        flex: 1;
        height: 100%;
        overflow: hidden;
        align-items: center;
        justify-content: center;
      }

      ${cssAnimation}
    </style>
  </head>
  <body>
    <main id="root" style="width: 100px; height: 100px;">
      ${logoWithoutFirstLine}
    </main>
    
  </body>
</html>

`);
}
