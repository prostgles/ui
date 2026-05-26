import {
  mdiApple,
  mdiInformationVariant,
  mdiLinux,
  mdiMicrosoftWindows,
} from "@mdi/js";
import React from "react";
import Btn from "@components/Btn";
import { ExpandSection } from "@components/ExpandSection";
import PopupMenu from "@components/PopupMenu";
import { DEFAULT_ELECTRON_CONNECTION } from "@common/electronInitTypes";
import { FlexCol } from "./Flex";

const OPERATING_SYSTEMS = [
  { key: "linux", label: "Linux", icon: mdiLinux },
  { key: "macosx", label: "macOS", icon: mdiApple },
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
          variant={"text"}
          color="action"
          style={{
            padding: ".25em",
            fontSize: "large",
            textDecoration: "underline",
          }}
        >
          How to install Postgres
        </Btn>
      }
      render={() => (
        <FlexCol className="  p-1 font-18  ta-left">
          <div>
            <div className="p-0 font-18 bold">Postgres official downloads:</div>
            <ul className=" ">
              {OPERATING_SYSTEMS.map(({ key, label, icon }) => (
                <li key={key}>
                  <a
                    href={`https://www.postgresql.org/download/${key}/`}
                    target="_blank"
                    color="action"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-1 font-18 bold">
              {placement === "state-db-quick-setup" ?
                "prostgles-desktop user creation:"
              : "prostgles-desktop user & database creation:"}
            </div>

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
        </FlexCol>
      )}
    />
  );
};
