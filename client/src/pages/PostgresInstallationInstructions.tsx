import Btn from "../components/Btn";
import PopupMenu from "../components/PopupMenu";
import { ExpandSection } from "../components/ExpandSection";
import { mdiInformationVariant, mdiLinux, mdiMicrosoftWindows } from "@mdi/js";
import React from "react";
import { DivProps } from "../components/Flex";

const OPERATING_SYSTEMS = [
  { key: "linux", label: "Linux", icon: mdiLinux },
  { key: "windows", label: "Windows", icon: mdiMicrosoftWindows },
  { key: "macosx", label: "MacOs", icon: mdiLinux },
] as const;
export type OS = typeof OPERATING_SYSTEMS[number]["key"];

type P = { 
  os: OS;
  placement: "state-db" | "add-connection"; 
} & Pick<DivProps, "className">;
export const PostgresInstallationInstructions = ({ os, className = "", placement }: P) => {

  return <PopupMenu 
    title="Postgres server installation" 
    positioning="center" 
    className={className} 
    rootStyle={{ maxWidth: "750px" }}
    button={
      <Btn
        variant={"outline"} color="action" 
        iconPath={mdiInformationVariant}
      >
        Installation steps
      </Btn>
    }
    render={() => (
      <div className="flex-col p-2 font-18 gap-2 ta-left">
        <div>
          <h3>Postgres Official installation instructions:</h3>
          <ul className="flex-row gap-1 jc-start">
            {OPERATING_SYSTEMS
              .map(({ key, label, icon }) => 
                <li key={key}>
                  <Btn href={`https://www.postgresql.org/download/${key}/`} 
                    target="_blank" color="action" 
                    variant={os === key? "filled" : "outline"} 
                    iconPath={icon}
                  >
                    {label}
                  </Btn>
                </li>
              )}  
          </ul>

        </div>

        <div>
          
          {placement === "add-connection"? 
            <p>
              Scripts to create a user and database
            </p> : 
            <p>
              It is recommended to create a new user <strong>prostgles_desktop</strong> and a new database <strong>prostgles_desktop_db</strong>. 
              Use a strong password to prevent security issues
            </p>
          }
          <ExpandSection label="Linux/MacOs" expanded={os !== "windows"}>
            <code className="bg-gray-900 text-white p-1 flex-col ta-left">
              sudo -u postgres createuser -P --superuser prostgles_desktop
            </code>
            <code className="bg-gray-900 text-white p-1 flex-col ta-left">
              sudo -u postgres createdb prostgles_desktop_db -O prostgles_desktop
            </code>
          </ExpandSection>
          <ExpandSection label="Windows" expanded={os === "windows"}>
            <p>PowerShell command. Change "15" to your actual postgres version number</p>
            <code className="bg-gray-900 text-white p-1 flex-col ta-left">
              & 'C:\Program Files\PostgreSQL\15\bin\createuser.exe' -U postgres -P --superuser prostgles_desktop
            </code>
            <code className="bg-gray-900 text-white p-1 flex-col ta-left">
              & 'C:\Program Files\PostgreSQL\15\bin\createdb.exe' -U postgres -O prostgles_desktop prostgles_desktop_db
            </code>
          </ExpandSection>

        </div>
      </div>
    )}
    footerButtons={[
      {onClickClose: true, label: "Close", variant: "filled", color: "action" }
    ]}
  />
}
