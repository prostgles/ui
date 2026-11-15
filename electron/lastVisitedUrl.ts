import { app, safeStorage } from "electron";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const getLastVisitedUrl = (appUrl: string) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return appUrl;
    const filePath = getLastVisitedUrlPath();
    if (!existsSync(filePath)) return appUrl;
    const savedPath = safeStorage.decryptString(readFileSync(filePath));
    const savedUrl = new URL(savedPath, appUrl);
    if (savedPath.startsWith("/") && savedUrl.origin === appUrl) {
      return savedUrl.href;
    }
  } catch (error) {
    console.error("Failed to read last visited URL", error);
  }
  return appUrl;
};

export const saveLastVisitedUrl = (url: string, appUrl: string) => {
  try {
    const visitedUrl = new URL(url);
    if (visitedUrl.origin !== appUrl) return;
    if (!safeStorage.isEncryptionAvailable()) return;
    writeFileSync(
      getLastVisitedUrlPath(),
      safeStorage.encryptString(
        visitedUrl.pathname + visitedUrl.search + visitedUrl.hash,
      ),
    );
  } catch (error) {
    console.error("Failed to save last visited URL", error);
  }
};

const getLastVisitedUrlPath = () =>
  join(app.getPath("userData"), ".prostgles-last-url");
