import { mdiArrowLeft, mdiArrowRight } from "@mdi/js";
import React, { useEffect, useState } from "react";
import type { AppState } from "../App";
import Btn from "../components/Btn";
import ErrorComponent from "../components/ErrorComponent";
import { FlexCol } from "../components/Flex";
import Loading, { pageReload } from "../components/Loading";
import { omitKeys, pickKeys } from "prostgles-types";
import { NewConnectionForm } from "./NewConnection/NewConnectionForm";
import type { Connection } from "./NewConnection/NewConnnection";
import { DEFAULT_CONNECTION } from "./NewConnection/NewConnnection";
import type { OS } from "./PostgresInstallationInstructions";
import { PostgresInstallationInstructions } from "./PostgresInstallationInstructions";

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
export const DEFAULT_ELECTRON_CONNECTION = {
  type: "Standard",
  db_host: "localhost",
  db_port: 5432,
  db_user: "prostgles_desktop",
  db_name: "prostgles_desktop_db",
} satisfies Omit<Connection, "name">;

export const ElectronSetup = ({ serverState }: ElectronSetup) => {
  const [c, setConnection] = useState<Connection>({
    ...DEFAULT_CONNECTION,
    ...DEFAULT_ELECTRON_CONNECTION,
    name: "prostgles_desktop",
  });
  const [validationWarning, setvalidationWarning] = useState<any>();

  const [loading, setLoading] = useState(false);

  const updateConnection = async (con: Partial<Connection>) => {
    setLoading(false);
    const newData = {
      ...c,
      ...con,
    };

    const res = await postConnection(newData, true);

    const { connection, warning } = res;

    setvalidationWarning(warning);
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

  const [step, setStep] = useState(0);

  const { electronCredsProvided, connectionError, initError, electronCreds } =
    serverState || {};
  const error = connectionError || initError;
  useEffect(() => {
    if (electronCredsProvided) {
      setStep(2);
      if (electronCreds) {
        setConnection((c) => ({
          ...c,
          ...omitKeys(electronCreds, ["db_ssl"]),
        }));
      }
    }
  }, [electronCredsProvided, setConnection, connectionError, electronCreds]);

  return (
    <FlexCol className="ElectronSetup m-auto min-s-0">
      {/* <div className="flex-row gap-1 ai-center mx-1">
        <DashboardMenuBtn style={{ border: "unset", background: "unset" }} />
        <h3 className="m-0 text-0p5">Prostgles Desktop</h3>
      </div> */}
      <div
        className="ta-center p-2  flex-col gap-2 max-w-700 o-auto  p-1"
        style={{ width: "500px" }}
      >
        {!step ?
          <div>
            <h3>PRIVACY</h3>
            <section className="ta-left  font-18">
              The only data we collect is the information you send us through
              the "Send feedback" button.
            </section>
          </div>
        : step === 1 ?
          <div>
            <h3>REQUIREMENTS</h3>
            <section className="ta-left font-18">
              <strong>Prostgles Desktop</strong> requires full access to a
              postgres database.
              <p>
                This database will be used to manage and store all connection
                and state data (database connection details, sql queries,
                workspaces, etc).
              </p>
              <p className="m-0 mt-p5">
                For best experience we recommend using a locally installed
                database
              </p>
              <div className="flex-row-wrap gap-2 f-1 mt-1">
                <PostgresInstallationInstructions
                  os={os}
                  placement="state-db"
                />
              </div>
            </section>
          </div>
        : <FlexCol className="f-1 min-s-0">
            {loading && !validationWarning ?
              <Loading
                id="main"
                className="m-auto"
                message="Connecting to electron state database"
              />
            : <FlexCol className="px-p25 min-s-0">
                <h2>State database</h2>
                <FlexCol className="min-s-0 o-auto px-p5">
                  <NewConnectionForm
                    mode="insert"
                    warning={validationWarning}
                    c={c}
                    nameErr={""}
                    isForStateDB={true}
                    updateConnection={updateConnection}
                    test={{
                      status: "",
                      statusOK: false,
                    }}
                    dbProps={undefined}
                  />
                </FlexCol>
              </FlexCol>
            }

            {!loading && error && (
              <ErrorComponent
                className="rounded f-0"
                style={{ background: "#fde8e8" }}
                withIcon={true}
                error={pickKeys(
                  serverState!,
                  ["connectionError", "initError"],
                  true,
                )}
              />
            )}

            {!loading && (
              <Btn
                data-command="ElectronSetup.Done"
                color="action"
                variant="filled"
                className="ml-auto"
                onClickMessage={async (e, setMsg) => {
                  setLoading(true);
                  try {
                    const resp = await postConnection(c, false);
                    if (resp.warning) {
                      setvalidationWarning(resp.warning);
                    } else {
                      await tout(3000);
                      pageReload("ElectronSetup.Done");
                      setLoading(false);
                    }
                  } catch (err) {
                    setvalidationWarning(err);
                    setLoading(false);
                  }
                }}
              >
                Done
              </Btn>
            )}
          </FlexCol>
        }

        {step < 2 && (
          <div
            className="flex-row f-1 mt-2"
            style={{ justifyContent: "space-between" }}
          >
            <Btn
              data-command="ElectronSetup.Back"
              onClick={() => {
                setStep((s) => Math.max(0, s - 1));
              }}
              iconPath={mdiArrowLeft}
              variant="outline"
              style={{ opacity: step ? 1 : 0 }}
            >
              Back
            </Btn>
            <Btn
              data-command="ElectronSetup.Next"
              onClick={() => {
                setStep((s) => Math.min(2, s + 1));
              }}
              iconPosition="right"
              iconPath={mdiArrowRight}
              color="action"
              variant="filled"
              style={{ opacity: step < 2 ? 1 : 0 }}
            >
              Next
            </Btn>
          </div>
        )}
      </div>
    </FlexCol>
  );
};

const postConnection = async (
  c: Connection,
  validate = false,
): Promise<{ connection?: Connection; warning?: any }> => {
  const res = await post("/dbs", {
    ...c,
    ...(validate ? { validate: true } : {}),
  });
  return await res.json();
};

export const tout = (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, timeout);
  });
};

const post = async (path: string, data: object) => {
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
