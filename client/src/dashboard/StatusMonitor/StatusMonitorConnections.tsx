import { mdiFilter, mdiStopCircleOutline } from "@mdi/js";
import React from "react";
import type { ConnectionStatus } from "@common/utils";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import PopupMenu from "@components/PopupMenu";
import { Table } from "@components/Table/Table";
import type { ProstglesColumn } from "../W_SQL/W_SQL";
import type { StatusMonitorProps } from "./StatusMonitor";

type P = Pick<StatusMonitorProps, "dbsMethods" | "connectionId"> & {
  c: ConnectionStatus;
  datidFilter: number | undefined;
  onSetDatidFilter: (datid: number) => void;
};
export const StatusMonitorConnections = ({
  c,
  dbsMethods,
  connectionId,
  onSetDatidFilter,
  datidFilter,
}: P) => {
  const connectionsColumns: ProstglesColumn[] = [
    {
      key: "kill-conneciton",
      label: "",
      name: "kill-conneciton",
      tsDataType: "string",
      udt_name: "text",
      filter: false,
      computed: false,
      sortable: false,
      width: 60,
      onRender: ({ row: { datid } }) => (
        <Btn
          title="Kill connection"
          iconPath={mdiStopCircleOutline}
          color="danger"
          onClickPromise={async () => {
            const query = `
            SELECT *, pg_terminate_backend(pid)
            FROM pg_stat_activity 
            WHERE pid <> pg_backend_pid()
            AND datid = \${datid};
          `;
            await dbsMethods.runConnectionQuery!(connectionId, query, {
              datid,
            });
          }}
        />
      ),
    },
    {
      key: "show-conneciton-queries",
      label: "",
      name: "show-conneciton-queries",
      tsDataType: "string",
      udt_name: "text",
      filter: false,
      computed: false,
      sortable: false,
      width: 60,
      onRender: ({ row: { datid } }) => (
        <Btn
          title="Filter queries by this connection"
          iconPath={mdiFilter}
          color="action"
          variant={datidFilter === datid ? "filled" : undefined}
          onClick={() => {
            onSetDatidFilter(datid);
          }}
        />
      ),
    },
    ...Object.keys(c.connections[0] ?? {}).map(
      (key) =>
        ({
          key,
          name: key,
          tsDataType: "string",
          udt_name: "text",
          filter: false,
          sortable: false,
          label: key,
          computed: false,
        }) satisfies ProstglesColumn,
    ),
  ];

  const connNum = c.connections.length;
  const maxConnNum = c.maxConnections;

  return (
    <PopupMenu
      className="f-0"
      title="Connections"
      clickCatchStyle={{ opacity: 0.5 }}
      onClickClose={false}
      button={
        <Chip
          className="noselect pointer"
          label={"Connections"}
          variant="header"
          color={(maxConnNum - connNum) / maxConnNum > 0.5 ? "green" : "yellow"}
        >
          {c.connections.length}/{c.maxConnections}
        </Chip>
      }
    >
      <Table cols={connectionsColumns} rows={c.connections} />
    </PopupMenu>
  );
};
