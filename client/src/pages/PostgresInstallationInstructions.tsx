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
import { DEFAULT_ELECTRON_CONNECTION } from "../../../common/electronInitTypes";

const OPERATING_SYSTEMS = [
  { key: "linux", label: "Linux", icon: mdiLinux },
  { key: "macosx", label: "MacOs", icon: mdiApple },
  { key: "windows", label: "Windows", icon: mdiMicrosoftWindows },
] as const;
export type OS = (typeof OPERATING_SYSTEMS)[number]["key"];

type P = {
  os: OS;
  placement: "state-db" | "add-connection" | "state-db-quick-setup";
  className?: string;
};
export const PostgresInstallationInstructions = ({
  os,
  className = "",
  placement,
}: P) => {
  const { db_user, db_name } = DEFAULT_ELECTRON_CONNECTION;

  return (
    <PopupMenu
      title="Postgres server installation"
      positioning="center"
      className={className}
      contentClassName=""
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
            <ul className="no-decor flex-row gap-1 jc-start">
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
            {placement === "state-db-quick-setup" ?
              <h3>Postgres user creation:</h3>
            : <h3>Postgres user & database creation:</h3>}

            <ExpandSection label="Linux/MacOs" expanded={os !== "windows"}>
              <code className="bg-terminal text-white p-1 flex-col ta-left">
                sudo -u postgres createuser -P --superuser {db_user}
              </code>
              {placement !== "state-db-quick-setup" && (
                <code className="bg-terminal text-white p-1 flex-col ta-left">
                  sudo -u postgres createdb {db_name} -O {db_user}
                </code>
              )}
            </ExpandSection>
            <ExpandSection label="Windows" expanded={os === "windows"}>
              <p>
                PowerShell command. Change &quot;15&quot; to your actual
                postgres version number
              </p>
              <code className="bg-terminal text-white p-1 flex-col ta-left">
                & &apos;C:\Program Files\PostgreSQL\15\bin\createuser.exe&apos;
                -U postgres -P --superuser {db_user}
              </code>
              {placement !== "state-db-quick-setup" && (
                <code className="bg-terminal text-white p-1 flex-col ta-left">
                  & &apos;C:\Program Files\PostgreSQL\15\bin\createdb.exe&apos;
                  -U postgres -O {db_user} {db_name}
                </code>
              )}
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
