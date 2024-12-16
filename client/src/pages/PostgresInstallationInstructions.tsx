import {
  mdiApple,
  mdiInformationVariant,
  mdiLinux,
  mdiMicrosoftWindows,
} from "@mdi/js";
import React from "react";
import Btn from "../components/Btn";
import { ExpandSection } from "../components/ExpandSection";
import PopupMenu from "../components/PopupMenu";
import { DEFAULT_ELECTRON_CONNECTION } from "./ElectronSetup";

const OPERATING_SYSTEMS = [
  { key: "linux", label: "Linux", icon: mdiLinux },
  { key: "macosx", label: "MacOs", icon: mdiApple },
  { key: "windows", label: "Windows", icon: mdiMicrosoftWindows },
] as const;
export type OS = (typeof OPERATING_SYSTEMS)[number]["key"];

type P = {
  os: OS;
  placement: "state-db" | "add-connection";
  className?: string;
};
export const PostgresInstallationInstructions = ({
  os,
  className = "",
  placement,
}: P) => {
  return (
    <PopupMenu
      title="Postgres server installation"
      positioning="center"
      className={className}
      clickCatchStyle={{ opacity: 0.5 }}
      rootStyle={{ maxWidth: "750px" }}
      data-command="PostgresInstallationInstructions"
      button={
        <Btn
          variant={"outline"}
          color="action"
          iconPath={mdiInformationVariant}
        >
          Installation steps
        </Btn>
      }
      render={() => (
        <div className="flex-col p-2 font-18 gap-2 ta-left">
          <div>
            <h3>Postgres installation instructions:</h3>
            <ul className="flex-row gap-1 jc-start">
              {OPERATING_SYSTEMS.map(({ key, label, icon }) => (
                <li key={key}>
                  <Btn
                    href={`https://www.postgresql.org/download/${key}/`}
                    target="_blank"
                    color="action"
                    variant={os === key ? "filled" : "outline"}
                    iconPath={icon}
                  >
                    {label}
                  </Btn>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3>Postgres new user & database creation:</h3>
            {placement === "add-connection" ?
              <p>Scripts to create a user and database</p>
            : <p>
                It is recommended to create a new user{" "}
                <strong>{DEFAULT_ELECTRON_CONNECTION.db_user}</strong> and a new
                database <strong>{DEFAULT_ELECTRON_CONNECTION.db_name}</strong>.
                Use a strong password to prevent security issues
              </p>
            }
            <ExpandSection label="Linux/MacOs" expanded={os !== "windows"}>
              <code className="bg-terminal text-white p-1 flex-col ta-left">
                sudo -u postgres createuser -P --superuser{" "}
                {DEFAULT_ELECTRON_CONNECTION.db_user}
              </code>
              <code className="bg-terminal text-white p-1 flex-col ta-left">
                sudo -u postgres createdb {DEFAULT_ELECTRON_CONNECTION.db_name}{" "}
                -O {DEFAULT_ELECTRON_CONNECTION.db_user}
              </code>
            </ExpandSection>
            <ExpandSection label="Windows" expanded={os === "windows"}>
              <p>
                PowerShell command. Change "15" to your actual postgres version
                number
              </p>
              <code className="bg-terminal text-white p-1 flex-col ta-left">
                & 'C:\Program Files\PostgreSQL\15\bin\createuser.exe' -U
                postgres -P --superuser {DEFAULT_ELECTRON_CONNECTION.db_user}
              </code>
              <code className="bg-terminal text-white p-1 flex-col ta-left">
                & 'C:\Program Files\PostgreSQL\15\bin\createdb.exe' -U postgres
                -O {DEFAULT_ELECTRON_CONNECTION.db_user}{" "}
                {DEFAULT_ELECTRON_CONNECTION.db_name}
              </code>
            </ExpandSection>
          </div>
        </div>
      )}
      footerButtons={[
        {
          onClickClose: true,
          label: "Close",
          variant: "filled",
          color: "action",
          "data-command": "PostgresInstallationInstructions.Close",
        },
      ]}
    />
  );
};
