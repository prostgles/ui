const { app, safeStorage } = require("electron");
const {
  openLoadingScreen,
  openProstglesApp,
} = require("../../build/mainWindow");

app.setPath("userData", process.argv[2]);
app.on("window-all-closed", () => {});
void app.whenReady().then(async () => {
  /* Headless Linux tests have no OS keyring. Enable the test-only fallback. */
  safeStorage.setUsePlainTextEncryption(true);
  await openLoadingScreen();
  openProstglesApp(Number(process.argv[3]), 0);
});
