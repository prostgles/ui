import * as crypto from "crypto";
import * as path from "path";
import { BrowserWindow, screen, shell, Tray, nativeImage, app } from "electron";
import { loadingHTML } from "./loadingHTML";
import { setContextMenu } from "./setContextMenu";

const iconPath = path.join(__dirname, "/../images/icon.ico");

/* createSessionSecret */
const electronSid = crypto.randomBytes(48).toString("hex");

/** Limit to single instance */
let mainWindow: BrowserWindow;

const focusIfOpen = () => {
  // Tried to run a second instance - focus main window.
  if (mainWindow) {
    /* protocolHandler.onSecondWindow(commandLine); */
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
};

const createWindow = () => {
  if (mainWindow) return mainWindow;

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
  setContextMenu(mainWindow);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // open url in a browser and prevent default
    shell.openExternal(url);
    return { action: "deny" };
  });

  return mainWindow;
};

const openLoadingScreen = async () => {
  // let loading = new BrowserWindow({ show: false, frame: false });
  createWindow();

  /** Show loading screen */
  try {
    await mainWindow.loadURL(loadingHTML);
  } catch (error) {
    console.error("Failed to load loading screen", error);
  }
};

let mainWindowLoaded: { port: number };
let didSetActivate = false;
const openProstglesApp = (port: number, delay = 1100) => {
  if (!port) return;
  const url = `http://localhost:${port}`;

  createWindow();
  setTimeout(async () => {
    if (port !== mainWindowLoaded?.port) {
      await loadWithRetries(url, port);
    }
    mainWindowLoaded = { port };
  }, delay);
};

const setSIDCookies = async (url: string) => {
  try {
    const ses = mainWindow.webContents.session;
    const cookie = { url, name: "sid_token", value: electronSid };
    await ses.clearStorageData({ storages: ["cookies"] });
    await ses.cookies.set(cookie);
    console.log("Setting cookie mainWindow.reload");
    mainWindow.reload();
  } catch (error) {
    console.error("Failed to set cookie: ", error);
  }
};

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
const loadWithRetries = async (url: string, port: number): Promise<void> => {
  try {
    await setSIDCookies(url);
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
      return loadWithRetries(url, port);
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
    // macOS keeps apps running after all windows close.
    // Must recreate window when user clicks dock icon to reactivate the app
    if (BrowserWindow.getAllWindows().length === 0) {
      openProstglesApp(port);
    }
  });
};

export { electronSid, focusIfOpen, openLoadingScreen, openProstglesApp };
