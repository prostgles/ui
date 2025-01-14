import type { App } from "electron";

/**
 * Disabled due to issue with text/html file association
 * https://github.com/electron/electron/issues/20382
 */
export const getProtocolHandler = ({
  app,
  expressApp,
}: {
  app: App;
  expressApp: any;
}) => {
  const protocolName = "prostgles-desktop";
  app.setAsDefaultProtocolClient(protocolName);

  const onOpenedProtocol = (url: string) => {
    console.log("onOpenedProtocol", { url });
    expressApp.setProstglesToken(url);
  };

  const onSecondWindow = (commandLine: string[]) => {
    /** Gets triggered if app is running and a protocol url was clicked */
    const protocolUrl = commandLine.find((v) =>
      v.startsWith(protocolName + "://"),
    );
    if (protocolUrl) {
      onOpenedProtocol(protocolUrl);
    }
  };

  const setOpenUrlListener = () => {
    /** Gets triggered if app is NOT running and a protocol url was clicked */
    app.on("open-url", function (event, data) {
      event.preventDefault();
      onOpenedProtocol(data);
    });
  };

  return { onOpenedProtocol, onSecondWindow, setOpenUrlListener };
};
