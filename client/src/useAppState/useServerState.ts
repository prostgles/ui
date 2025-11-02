import { usePromise } from "prostgles-client/dist/react-hooks";
import { includes } from "prostgles-types";
import type { ProstglesState } from "@common/electronInitTypes";
import { SPOOF_TEST_VALUE } from "@common/utils";
import type { AppState } from "../App";
import { tout } from "../utils";
import { MOCK_ELECTRON_WINDOW_ATTR } from "src/Testing";

/**
 * Check if state database is setup
 */
const fetchServerState = async () => {
  // window.MOCK_ELECTRON_WINDOW_ATTR = true;
  const serverState: AppState["serverState"] =
    window[MOCK_ELECTRON_WINDOW_ATTR] ?
      {
        isElectron: true,
        initState: {
          state: "ok",
        },
        electronCredsProvided: false,
      }
    : await fetch("/dbs", {
        headers: { "x-real-ip": SPOOF_TEST_VALUE },
      }).then((r) => r.json());
  return serverState;
};

export const useServerState = () => {
  const serverState = usePromise(async () => {
    window.document.title = `Prostgles`;
    try {
      let serverState = await fetchServerState();
      let attemptsLeft = 3;
      while (
        attemptsLeft &&
        !includes(["error", "ok"], serverState?.initState.state)
      ) {
        attemptsLeft--;
        /** Maybe loading, try again */
        console.warn("Prostgles could not connect. Retrying in 1 second");
        await tout(1000);
        serverState = await fetchServerState();
      }

      window.document.title = `Prostgles ${serverState?.isElectron ? "Desktop" : "UI"}`;
      return serverState;
    } catch (initError) {
      console.error(initError);
      return {
        initState: {
          state: "error",
          error: initError as Error,
          errorType: "init",
        },
        isElectron: false,
      } satisfies ProstglesState;
    }
  });

  return serverState;
};
