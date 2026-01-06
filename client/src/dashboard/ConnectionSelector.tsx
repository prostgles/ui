import { mdiDatabase } from "@mdi/js";
import React from "react";
import { Select } from "@components/Select/Select";
import { t } from "../i18n/i18nUtils";
import type { Connection } from "../pages/NewConnection/NewConnnectionForm";
import type { DBS } from "./Dashboard/DBS";
import type { DBSSchema } from "@common/publishUtils";

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

const getServerInfoStr = (c: DBSSchema["connections"], showuser = false) => {
  const userInfo = showuser && c.db_user ? `${c.db_user}@` : "";
  return `${userInfo}${c.db_host || "localhost"}:${c.db_port || "5432"}/${c.db_name}`;
};
