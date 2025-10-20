import { omitKeys, type AnyObject } from "prostgles-types";
import { useEffect, useState } from "react";
import { DEFAULT_ELECTRON_CONNECTION } from "../../../../common/electronInitTypes";
import type { AppState } from "../../App";
import { pageReload } from "../../components/Loader/Loading";
import type { Connection } from "../NewConnection/NewConnnectionForm";
import { DEFAULT_CONNECTION } from "../NewConnection/NewConnnectionForm";
import type { OS } from "../PostgresInstallationInstructions";
import { tout } from "./ElectronSetup";

type ElectronSetup = {
  serverState: AppState["serverState"];
};

export const getOS = () => {
  const { platform } = window.navigator;
  const os: OS =
    platform.startsWith("Mac") ? "macosx"
    : platform.startsWith("Linux") || platform.includes("BSD") ? "linux"
    : "windows";
  return os;
};

export const useElectronSetup = ({ serverState }: ElectronSetup) => {
  const [c, setConnection] = useState<Connection>({
    ...DEFAULT_CONNECTION,
    ...DEFAULT_ELECTRON_CONNECTION,
    name: "prostgles_desktop",
  });
  const [validationWarning, setValidationWarning] = useState<any>();

  const [loading, setLoading] = useState(false);
  const [isQuickMode, setIsQuickMode] = useState(true);

  const updateConnection = async (con: Partial<Connection>) => {
    setLoading(false);
    const newData = {
      ...c,
      ...con,
    };

    const res = await postConnection(newData, "validate");

    const { connection, warning } = res;

    setValidationWarning(warning);
    if (connection) {
      setConnection(connection);
    }
  };

  const os = getOS();

  useEffect(() => {
    setConnection((c) => ({
      ...c,
      ...(os === "windows" && { db_ssl: "disable" }),
    }));
  }, [setConnection, os]);

  const [step, setStep] = useState<"1-privacy" | "2-setup">("1-privacy");

  const { electronCredsProvided, initState, electronCreds } = serverState || {};
  const error =
    initState?.state === "error" ? initState.error || "Init error" : null;
  useEffect(() => {
    if (electronCredsProvided) {
      setStep("2-setup");
      if (electronCreds) {
        setConnection((c) => ({
          ...c,
          ...omitKeys(electronCreds, ["db_ssl"]),
        }));
      }
    }
  }, [electronCredsProvided, setConnection, error, electronCreds]);

  const onPressDone = async () => {
    setLoading(true);
    try {
      const resp = await postConnection(c, isQuickMode ? "quick" : "manual");
      if (resp.warning) {
        setValidationWarning(resp.warning);
      } else {
        await tout(3000);
        pageReload("ElectronSetup.Done");
      }
    } catch (err) {
      setValidationWarning(err);
    }
    setLoading(false);
  };

  return {
    c,
    setConnection,
    validationWarning,
    loading,
    updateConnection,
    os,
    step,
    setStep,
    error,
    isQuickMode,
    setIsQuickMode,
    onPressDone,
    setLoading,
  };
};

const postConnection = async (
  connection: Connection,
  mode: "validate" | "quick" | "manual",
): Promise<{ connection?: Connection; warning?: any }> => {
  const res = await post("/dbs", {
    connection,
    mode,
  });
  return await res.json();
};

const post = async (path: string, data: AnyObject) => {
  const rawResponse = await fetch(path, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!rawResponse.ok) {
    const error = await rawResponse
      .json()
      .catch(() => rawResponse.text())
      .catch(() => rawResponse.statusText);
    throw error;
  }

  return rawResponse;
};
