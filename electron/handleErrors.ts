const unhandled = require("electron-unhandled");
export const handleErrors = () => {
  // Exit interminable stream of errors
  const handleStreamError = (err: NodeJS.ErrnoException): void => {
    if (err.code === "EIO" || err.code === "EPIPE") process.exit(0);
  };

  process.stdout.on("error", handleStreamError);
  process.stderr.on("error", handleStreamError);

  // Also intercept before unhandled catches it
  const originalEmit = process.emit.bind(process) as typeof process.emit;

  process.emit = ((event: string, ...args: unknown[]): boolean => {
    if (event === "uncaughtException") {
      const err = args[0] as NodeJS.ErrnoException;
      if (err?.code === "EIO" || err?.code === "EPIPE") {
        process.exit(0);
      }
    }
    return originalEmit(event as never, ...(args as never[]));
  }) as typeof process.emit;

  unhandled();
};
