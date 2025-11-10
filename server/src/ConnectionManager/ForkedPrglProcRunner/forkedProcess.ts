import prostgles from "prostgles-server";
import type { OnReadyParamsBasic } from "prostgles-server/dist/initProstgles";
import { getSerialisableError } from "prostgles-types";
import { FORKED_PROC_ENV_NAME } from "@common/utils";
import type {
  ForkedProcMessage,
  ForkedProcMessageError,
  ForkedProcMessageResult,
} from "./ForkedPrglProcRunner";

export const getError = (rawError: any) => {
  return getSerialisableError(rawError) || "Unknown error";
};
const initForkedProc = () => {
  let _prglParams: OnReadyParamsBasic | undefined;
  let prglParams: OnReadyParamsBasic | undefined;

  const lastToolCallId = 0;
  const toolCalls: Record<number, { cb: (err: any, res: any) => void }> = {};
  const setProxy = (params: OnReadyParamsBasic) => {
    _prglParams = params;
    prglParams ??= new Proxy(params, {
      get(target, prop: keyof OnReadyParamsBasic, receiver) {
        return _prglParams![prop];
      },
    });
  };

  let lastMsgId = "";
  const sendError = (error: any) => {
    process.send?.({
      lastMsgId,
      type: "error",
      error: getSerialisableError(error),
    } satisfies ForkedProcMessageError);
  };
  process.on("unhandledRejection", (reason: any, p) => {
    console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
    sendError(reason);
  });
  process.on("uncaughtException", (error: any, origin) => {
    console.error("Uncaught Exception: ", error, "origin:", origin);
    sendError(error);
  });

  if (!process.send) {
    console.error("No process.send");
  }
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  process.on("message", async (msg: ForkedProcMessage) => {
    try {
      if ("id" in msg) lastMsgId = msg.id;
      const cb = (error?: any, result?: any) => {
        process.send!({
          id: msg.id,
          error,
          result,
        } satisfies ForkedProcMessageResult);
      };
      if (msg.type === "start") {
        if (prglParams) throw "Already started";

        //@ts-ignore
        await prostgles({
          ...msg.prglInitOpts,
          watchSchema: "*",
          transactions: true,
          onReady: (params) => {
            if (prglParams) {
              console.log("reload", params.reason);
              cb(undefined, "reload");
            } else {
              cb(undefined, "ready");
            }
            setProxy(params as any);
          },
        });
      } else {
        if (!prglParams) throw "prgl not ready";

        try {
          if (msg.type === "mcpResult") {
            const { callId, error, result } = msg;
            toolCalls[callId]?.cb(error, result);
            delete toolCalls[callId];
          } else if (msg.type === "run") {
            const { code, validatedArgs, user, id } = msg;
            const { run } = eval(code + "\n\n exports;");
            // const callMCPServerTool = async (
            //   serverName: string,
            //   toolName: string,
            //   args?: any,
            // ) => {
            //   return new Promise((resolve, reject) => {
            //     const callId = lastToolCallId++;
            //     toolCalls[callId] = {
            //       cb: (err, res) => (err ? reject(err) : resolve(res)),
            //     };
            //     process.send?.({
            //       id,
            //       callId,
            //       type: "toolCall",
            //       serverName,
            //       toolName,
            //       args,
            //     } satisfies ForkedProcMessageResult);
            //   });
            // };
            const methodResult = await run(validatedArgs, {
              ...prglParams,
              user,
              // callMCPServerTool,
            });
            cb(undefined, methodResult);
          } else {
            const { code } = msg;
            const { onMount } = eval(code + "\n\n exports;");

            const methodResult = await onMount(prglParams);
            cb(undefined, methodResult);
          }
        } catch (rawError: any) {
          const error = getSerialisableError(rawError);
          console.error("forkedProcess error", error);
          cb(error);
        }
      }
    } catch (error) {
      console.error(error);
      sendError(error);
    }
  });
};

if (process.env[FORKED_PROC_ENV_NAME]) {
  initForkedProc();
  checkForImportBug();
}

function checkForImportBug() {
  const ESMFiles = module.children.map((m) => ({
    type: "ESM" as const,
    filename: m.filename,
  }));
  const mainProcess = ESMFiles.find((f) =>
    f.filename
      .replaceAll("\\", "/")
      .endsWith("ui/server/dist/server/src/index.js"),
  );
  if (mainProcess) {
    throw new Error(
      "Forked process should not import main process file. It will trigger this bug: listen EADDRINUSE: address already in use 127.0.0.1:3004",
    );
  }
  return ESMFiles;
}
