import type { AnyObject } from "prostgles-types";
import { useEffect, useState } from "react";
import { DEFAULT_ELECTRON_CONNECTION } from "@common/electronInitTypes";
import type { AppState } from "../../App";
import { pageReload } from "@components/Loader/Loading";
import type { Connection } from "../NewConnection/NewConnectionForm";
import { DEFAULT_CONNECTION } from "../NewConnection/NewConnectionForm";
import type { OS } from "../../components/PostgresInstallationInstructions";
import { tout } from "./ElectronSetup";
import { API_ENDPOINTS } from "@common/utils";

type ElectronSetup = {
  serverState: AppState["serverState"];
  error: unknown;
};

export const getOS = () => {
  const { platform } = window.navigator;
  const os: OS =
    platform.startsWith("Mac") ? "macosx"
    : platform.startsWith("Linux") || platform.includes("BSD") ? "linux"
    : "windows";
  return os;
};

export const useElectronSetup = ({ serverState, error }: ElectronSetup) => {
  const [isQuickMode, setIsQuickMode] = useState(true);
  const [connection, setConnection] = useState<Connection>({
    ...DEFAULT_CONNECTION,
    ...DEFAULT_ELECTRON_CONNECTION,
    ...(isQuickMode && { db_user: "postgres" }),
    name: "prostgles_desktop",
  });
  const [validationWarning, setValidationWarning] = useState<unknown>();

  const [loading, setLoading] = useState(false);

  const updateConnection = async (connectionUpdates: Partial<Connection>) => {
    setLoading(false);
    const newData = {
      ...connection,
      ...connectionUpdates,
    };

    const { connection: validatedConnection, warning } = await postConnection(
      newData,
      "validate",
    );

    setValidationWarning(warning);
    if (validatedConnection) {
      setConnection(validatedConnection);
    }
  };

  const os = getOS();

  useEffect(() => {
    setConnection((c) => ({
      ...c,
      ...(os === "windows" && { db_ssl: "disable" }),
    }));
  }, [setConnection, os]);

  const [step, setStep] = useState<"1-privacy" | "2-setup" | "startup-error">(
    error ? "startup-error" : "1-privacy",
  );

  const { electronCredsProvided, electronCreds } = serverState || {};
  useEffect(() => {
    if (electronCredsProvided || error) {
      setStep(error ? "startup-error" : "2-setup");
      if (electronCreds) {
        setIsQuickMode(false);
        setConnection((c) => ({
          ...c,
          ...electronCreds,
        }));
      }
    }
  }, [electronCredsProvided, setConnection, error, electronCreds]);

  const onPressDone = async () => {
    setLoading(true);
    try {
      const resp = await postConnection(
        connection,
        isQuickMode ? "quick" : "manual",
      );
      if (resp.warning) {
        setValidationWarning(resp.warning);
      } else {
        await tout(3000);
        void pageReload("ElectronSetup.Done");
      }
    } catch (err) {
      setValidationWarning(err);
    }
    setLoading(false);
  };

  return {
    c: connection,
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
): Promise<{ connection?: Connection; warning?: unknown }> => {
  const res = await post(API_ENDPOINTS.DBS, {
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
