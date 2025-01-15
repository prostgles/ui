import React from "react";
import Select from "../components/Select/Select";
import { getServerInfoStr } from "../pages/Connections/Connections";
import { mdiDatabase } from "@mdi/js";
import type { Connection } from "../pages/NewConnection/NewConnnection";
import type { DBS } from "./Dashboard/DBS";
import { t } from "../i18n/i18nUtils";

type P = {
  dbs: DBS;
  connection: Connection;
  location: "workspace" | "config";
};

export const ConnectionSelector = ({ connection, dbs, location }: P) => {
  const { data: connections } = dbs.connections.useFind();
  return (
    <Select
      title={t.ConnectionSelector["Switch database"]}
      data-command="ConnectionSelector"
      fullOptions={(connections ?? []).map((c) => ({
        key: c.id,
        label: c.name || c.db_name || c.id,
        subLabel: !c.db_name ? undefined : getServerInfoStr(c, true),
      }))}
      onChange={(cId) => {
        const subpath =
          location === "workspace" ? "connections" : "connection-config";
        const newLocation = `/${subpath}/${cId}${window.location.search}`;
        window.location.href = newLocation;
      }}
      value={connection.id}
      btnProps={{
        iconPath: mdiDatabase,
        iconPosition: "left",
        variant: "faded",
        style: {
          flex: 1,
          minWidth: 0,
          maxWidth: "fit-content",
        },
      }}
    />
  );
};
