import React from "react"
import Select from "../components/Select/Select";
import { getServerInfoStr } from "../pages/Connections/Connections";
import { mdiDatabase } from "@mdi/js";
import { Connection } from "../pages/NewConnection/NewConnnection";
import { DBS } from "./Dashboard/DBS";
import { usePromise } from "./ProstglesMethod/hooks";

type P = {
  dbs: DBS;
  connection: Connection;
  location: "workspace" | "config";
}

export const ConnectionSelector = ({ connection, dbs, location }: P) => {

  const connections = usePromise(() => dbs.connections.find(), [dbs]);
  return  <Select 
    title="Switch database"
    fullOptions={(connections ?? []).map(c => ({
      key: c.id,
      label: c.name ?? c.db_name ?? c.id,
      subLabel: getServerInfoStr(c, true),
    }))}
    onChange={cId => {
      const subpath = location === "workspace"? "connections" : "connection-config"
      const newLocation = `/${subpath}/${cId}`;
      window.location.href = newLocation;
    }}
    value={connection.id}
    btnProps={{
      iconPath: mdiDatabase,
      iconPosition: "left",
      style: {
        color: "var(--gray-100)",
        background: "var(--gray-700)",
        flex: 1,
        minWidth: 0,
        maxWidth: "fit-content",
      }, 
    }}
  />
}