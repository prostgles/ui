import React from "react";
import { DEFAULT_ELECTRON_CONNECTION } from "@common/electronInitTypes";
import { FlexCol } from "@components/Flex";
import FormField from "@components/FormField/FormField";
import Tabs from "@components/Tabs";
import { t } from "../../i18n/i18nUtils";
import { NewConnectionForm } from "../NewConnection/NewConnectionFormFields";
import type { useElectronSetup } from "./useElectronSetup";
import { PostgresInstallationInstructions } from "../../components/PostgresInstallationInstructions";
import ErrorComponent from "@components/ErrorComponent";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { InfoRow } from "@components/InfoRow";
import ButtonGroup from "@components/ButtonGroup";

export const ElectronSetupStateDB = ({
  state,
}: {
  state: ReturnType<typeof useElectronSetup>;
}) => {
  const {
    c,
    validationWarning,
    updateConnection,
    isQuickMode,
    setIsQuickMode,
    os,
  } = state;

  return (
    <ScrollFade className="px-p25 min-s-0 flex-col f-1 oy-auto no-scroll-bar">
      <h2>State database</h2>
      <section className="ta-left font-18">
        <strong>Prostgles Desktop</strong> needs a PostgreSQL database to
        securely store your workspace and connection settings.
        <p className="m-0 my-p5">
          For best experience we recommend using a locally installed database
        </p>
        <PostgresInstallationInstructions
          os={os}
          placement="state-db-quick-setup"
        />
      </section>
      <Tabs
        className="mt-2"
        activeKey={isQuickMode ? "quick" : "manual"}
        onChange={(key) => {
          setIsQuickMode(key === "quick");
        }}
        contentClass="ta-left py-2"
        items={{
          quick: {
            label: "Quick setup",
            content: (
              <FlexCol>
                <div>
                  Enter the credentials of your local PostgreSQL superuser
                  (often postgres). These will be used once to create the
                  Prostgles Desktop database.
                </div>
                <div>
                  Will create a{" "}
                  {c.db_user !== DEFAULT_ELECTRON_CONNECTION.db_user && (
                    <>
                      <strong>{DEFAULT_ELECTRON_CONNECTION.db_user}</strong>{" "}
                      superuser and a{" "}
                    </>
                  )}
                  <strong>{DEFAULT_ELECTRON_CONNECTION.db_name}</strong> state
                  database if missing on{" "}
                  <strong>
                    {c.db_host}:{c.db_port}
                  </strong>
                  <br></br>
                </div>
                {c.db_user !== DEFAULT_ELECTRON_CONNECTION.db_user && (
                  <div>
                    *If <strong>{DEFAULT_ELECTRON_CONNECTION.db_user}</strong>{" "}
                    user exists will overwrite password with a randomly
                    generated one
                  </div>
                )}

                <FormField
                  id="u"
                  value={c.db_user}
                  label={t.NewConnectionForm["User"]}
                  type="text"
                  autoComplete="off"
                  onChange={(db_user) => updateConnection({ db_user })}
                />
                <FormField
                  id="pass"
                  value={c.db_pass ?? ""}
                  label={t.NewConnectionForm["Password"]}
                  type="text"
                  autoComplete="off"
                  onChange={(db_pass) => updateConnection({ db_pass })}
                />
                {
                  <ErrorComponent
                    error={validationWarning}
                    style={{ minWidth: 0 }}
                  />
                }
              </FlexCol>
            ),
          },
          manual: {
            label: "Manual setup",
            content: (
              <FlexCol className="px-p25 min-s-0">
                <div>
                  Provide the connection details to an existing database that
                  will be used as the state database
                </div>
                <InfoRow color="danger">
                  <strong>This database will be modified.</strong> Required
                  metadata tables will be created in this database.
                </InfoRow>
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
            ),
          },
        }}
      />
    </ScrollFade>
  );
};
