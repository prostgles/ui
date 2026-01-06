const unhandled = require("electron-unhandled");
unhandled();
import { app, shell, safeStorage as ss, type SafeStorage } from "electron";
import * as path from "path";
import {
  electronSid,
  focusIfOpen,
  openLoadingScreen,
  openProstglesApp,
} from "./mainWindow";
// import { getProtocolHandler } from "./getProtocolHandler";

let localCreds: any;

/**
 * Safe storage encryption works only with a launched browser (electron.launch without "--no-sandbox") and launch without xvfb-run
 * but this does not work within containers
 */
const safeStorage: SafeStorageHandles =
  process.env.TEST_MODE === "true" ?
    ({
      encryptString: (str: string) => {
        localCreds = str;
        console.log("encryptString", { str });
        return str;
      },
      decryptString: (str: string) => {
        console.log("decryptString", { str, localCreds });
        return localCreds;
      },
    } as unknown as SafeStorageHandles)
  : ss;

type SafeStorageHandles = Pick<SafeStorage, "encryptString" | "decryptString">;

type StartParams = {
  safeStorage: SafeStorageHandles;
  rootDir: string;
  electronSid: string;
  openPath: (path: string, isFile?: boolean) => void;
  onReady: (port: number) => void;
};
process.env.NODE_ENV = "production";
const expressApp = require("../ui/server/dist/server/src/electronConfig") as {
  start: (params: StartParams) => Promise<{ destroy: () => Promise<void> }>;
};

// const protocolHandler = getProtocolHandler({
//   app,
//   expressApp,
// });

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log("Electron multi instance not allowed. Exiting...");
  app.quit();
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    focusIfOpen();
  });

  initApp();
}

let onDestroy: (() => Promise<void>) | undefined;
function initApp() {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  console.log("Initialising electron app...");

  app.whenReady().then(async () => {
    await openLoadingScreen();

    console.log("Electron app ready, starting express server...");
    console.log(
      "State db auth file: " +
        path.resolve(
          `${app.getPath("userData")}/.prostgles-desktop-config.json`,
        ),
    );

    const hooks = await expressApp
      .start({
        safeStorage,
        rootDir: app.getPath("userData"),
        electronSid,
        openPath: (path: string, isFile?: boolean) => {
          // Show the given file in a file manager. If possible, select the file.
          if (isFile) {
            shell.showItemInFolder(path);
          } else {
            shell.openPath(path);
          }
        },
        onReady: (actualPort: number) => {
          console.log("Express server started on port " + actualPort);
          openProstglesApp(actualPort);
        },
      })
      .catch((err: any) => {
        console.error("Failed to start expressApp.start", err);
      });
    onDestroy = hooks?.destroy;

    app.on("before-quit", async (e) => {
      onDestroy?.();
    });
  });

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  /* protocolHandler.setOpenUrlListener(); */
}
