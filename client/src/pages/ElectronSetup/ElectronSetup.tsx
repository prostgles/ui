import { mdiArrowLeft, mdiArrowRight, mdiConnection } from "@mdi/js";
import React from "react";
import type { AppState } from "../../App";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import type { OS } from "../../components/PostgresInstallationInstructions";
import { ElectronSetupStateDB } from "./ElectronSetupStateDB";
import { useElectronSetup } from "./useElectronSetup";

type ElectronSetup = {
  serverState: AppState["serverState"];
  error: unknown;
};

export const getBrowserOS = () => {
  const { platform } = window.navigator;
  const os: OS =
    platform.startsWith("Mac") ? "macosx"
    : platform.startsWith("Linux") || platform.includes("BSD") ? "linux"
    : "windows";
  return os;
};

export const ElectronSetup = ({ serverState, error }: ElectronSetup) => {
  const state = useElectronSetup({
    serverState,
    error,
  });
  const { step, setStep, loading, validationWarning, onPressDone } = state;

  return (
    <FlexCol className="ElectronSetup m-auto min-s-0">
      <div
        className={"ta-center p-2  flex-col gap-2 max-w-700 p-1 min-h-0 "}
        style={{ width: "600px" }}
      >
        <ErrorComponent
          className="rounded f-0"
          style={{ background: "#fde8e8", padding: ".5rem" }}
          title="Startup failed"
          withIcon={true}
          error={error}
        />
        {step === "startup-error" ?
          <Btn
            onClick={() => setStep("2-setup")}
            color="action"
            variant="filled"
          >
            Edit connection details
          </Btn>
        : step === "1-privacy" ?
          <div>
            <h3>PRIVACY</h3>
            <section className="ta-left  font-18">
              The only data we collect is the information you send us through
              the <strong>Send feedback</strong> button.
            </section>
          </div>
        : <FlexCol className="f-1 min-s-0 ">
            {loading && !validationWarning ?
              <Loading
                id="main"
                className="m-auto"
                message="Connecting to electron state database"
              />
            : <ElectronSetupStateDB state={state} />}
          </FlexCol>
        }

        {!loading && step !== "startup-error" && (
          <FlexRow style={{ justifyContent: "space-between" }}>
            <Btn
              data-command="ElectronSetup.Back"
              onClick={() => {
                setStep(error ? "startup-error" : "1-privacy");
              }}
              iconPath={mdiArrowLeft}
              variant="outline"
              size="default"
              style={{ opacity: step === "2-setup" ? 1 : 0 }}
            >
              Back
            </Btn>

            {step === "1-privacy" ?
              <Btn
                data-command="ElectronSetup.Next"
                onClick={() => {
                  setStep("2-setup");
                }}
                iconPosition="right"
                iconPath={mdiArrowRight}
                color="action"
                variant="filled"
                size="default"
              >
                Next
              </Btn>
            : <Btn
                data-command="ElectronSetup.Done"
                color="action"
                variant="filled"
                className="ml-auto"
                iconPath={mdiConnection}
                onClickMessage={onPressDone}
                size="default"
              >
                Connect
              </Btn>
            }
          </FlexRow>
        )}
      </div>
    </FlexCol>
  );
};

export const tout = (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, timeout);
  });
};
