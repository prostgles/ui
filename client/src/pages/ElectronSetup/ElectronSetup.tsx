import { mdiArrowLeft, mdiArrowRight, mdiConnection } from "@mdi/js";
import React from "react";
import type { AppState } from "../../App";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexCol, FlexRow } from "../../components/Flex";
import Loading from "../../components/Loading";
import type { OS } from "../PostgresInstallationInstructions";
import { ElectronSetupStateDB } from "./ElectronSetupStateDB";
import { useElectronSetup } from "./useElectronSetup";

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

export const ElectronSetup = ({ serverState }: ElectronSetup) => {
  const state = useElectronSetup({
    serverState,
  });
  const { step, setStep, loading, validationWarning, error, onPressDone } =
    state;

  return (
    <FlexCol className="ElectronSetup m-auto min-s-0">
      <div
        className={"ta-center p-2  flex-col gap-2 max-w-700 p-1 min-h-0 "}
        style={{ width: "500px" }}
      >
        {step === "1-privacy" ?
          <div>
            <h3>PRIVACY</h3>
            <section className="ta-left  font-18">
              The only data we collect is the information you send us through
              the &quot;Send feedback&quot; button.
            </section>
          </div>
        : <FlexCol className="f-1 min-s-0 o-auto">
            {loading && !validationWarning ?
              <Loading
                id="main"
                className="m-auto"
                message="Connecting to electron state database"
              />
            : <ElectronSetupStateDB state={state} />}

            {Boolean(!loading && error) && (
              <ErrorComponent
                className="rounded f-0"
                style={{ background: "#fde8e8" }}
                withIcon={true}
                error={
                  serverState?.initState.state === "error" ? error : undefined
                }
              />
            )}
          </FlexCol>
        }

        <FlexRow style={{ justifyContent: "space-between" }}>
          <Btn
            data-command="ElectronSetup.Back"
            onClick={() => {
              setStep("1-privacy");
            }}
            iconPath={mdiArrowLeft}
            variant="outline"
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
            >
              Next
            </Btn>
          : !loading && (
              <Btn
                data-command="ElectronSetup.Done"
                color="action"
                variant="filled"
                className="ml-auto"
                iconPath={mdiConnection}
                onClickMessage={onPressDone}
              >
                Done
              </Btn>
            )
          }
        </FlexRow>
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
