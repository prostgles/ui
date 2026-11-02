import type { DBSSchema } from "@common/publishUtils";
import { STATUS_MONITOR_IGNORE_QUERY } from "@common/utils";
import Btn from "@components/Btn";
import Chip from "@components/Chip";
import { FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import PopupMenu from "@components/PopupMenu";
import { mdiCancel, mdiStopCircleOutline } from "@mdi/js";
import { usePromise } from "prostgles-client";
import React, { useMemo, useState } from "react";
import { usePrglCore } from "src/useAppState/PrglCoreContextProvider";
import type { AppContextProps } from "../../App";
import CodeExample from "../CodeExample";
import type { FieldConfig } from "../SmartCard/SmartCard";
import type { SmartCardListProps } from "../SmartCardList/SmartCardList";
import { SmartCardList } from "../SmartCardList/SmartCardList";
import { StyledInterval } from "../W_SQL/customRenderers";
import type { StatusMonitorProps } from "./StatusMonitor";
import { StatusMonitorBlockedByPid } from "./StatusMonitorBlockedByPid";
import { StatusMonitorProcListControlsHeader } from "./StatusMonitorProcListControlsHeader";

export const StatusMonitorViewTypes = [
  { key: "All Queries", subLabel: "No filtering applied" },
  {
    key: "Active queries",
    subLabel:
      "All queries with 'active' state excluding the queries used to create this view",
  },
  {
    key: "Blocked queries",
    subLabel: "Queries that have are blocked by other queries",
  },
] as const;
export type StatusMonitorViewType =
  (typeof StatusMonitorViewTypes)[number]["key"];

const orderByCPU = {
  key: "cpu",
  asc: false,
} as const;
export const StatusMonitorProcList = (
  props: StatusMonitorProps & {
    samplingRate: number;
    noBash: boolean | undefined;
  },
) => {
  const { dbs, dbsMethods, dbsMethodSchema, dbsTables, dbsSql } = usePrglCore();
  const { runConnectionQuery } = dbsMethods;
  const { connectionId, samplingRate, noBash } = props;
  const [viewType, setViewType] = useState<StatusMonitorViewType>(
    StatusMonitorViewTypes[1].key,
  );

  const [toggledFields, setToggledFields] = useState<string[]>([]);
  const { fieldConfigs, excludedFields } = useStatusMonitorProcListProps(
    dbsMethods,
    toggledFields,
    connectionId,
    noBash ?? true,
  );
  const allToggledFields = useMemo(
    () =>
      fieldConfigs
        .filter(
          (f) =>
            typeof f === "string" || (!(f as any).hide && !(f as any).hideIf),
        )
        .map((f) => (typeof f === "string" ? f : f.name)),
    [fieldConfigs],
  );

  const [datidFilter, setDatidFilter] = useState<number | undefined>();

  const databaseId = usePromise(async () => {
    const datids = await runConnectionQuery!({
      conId: connectionId,
      query: `SELECT datid
      FROM pg_catalog.pg_stat_database
      WHERE datname = current_database()
    `,
    });
    if (datids.length === 1) {
      const datid = datids[0]?.datid as number;
      setDatidFilter(datid);
      return datid;
    }
  }, [runConnectionQuery, connectionId]);

  const filter = useMemo(() => {
    return {
      $and: [
        {
          ...(datidFilter ? { datid: datidFilter } : {}),
          ...(viewType === "Blocked queries" ? { blocked_by_num: { ">": 0 } }
          : viewType === "Active queries" ?
            {
              state: "active",
              query: { $nilike: `%${STATUS_MONITOR_IGNORE_QUERY}%` },
            }
          : {}),
        },
      ],
    };
  }, [datidFilter, viewType]);

  return (
    <SmartCardList
      sql={dbsSql}
      db={dbs}
      methods={dbsMethodSchema}
      tables={dbsTables}
      tableName="stats"
      showEdit={false}
      showTopBar={{
        sort: true,
        leftContent: (
          <StatusMonitorProcListControlsHeader
            {...props}
            allToggledFields={allToggledFields}
            excludedFields={excludedFields}
            setToggledFields={setToggledFields}
            datidFilter={datidFilter}
            setDatidFilter={setDatidFilter}
            databaseId={databaseId}
            viewType={viewType}
            setViewType={setViewType}
            samplingRate={samplingRate}
          />
        ),
      }}
      orderBy={orderByCPU}
      rowProps={{
        style: {
          borderRadius: 0,
        },
      }}
      noDataComponent={
        <InfoRow color="info" variant="filled">
          No {viewType}
        </InfoRow>
      }
      realtime={true}
      throttle={500}
      filter={filter}
      fieldConfigs={fieldConfigs}
    />
  );
};

type FieldConfigs = Required<SmartCardListProps>["fieldConfigs"];

const useStatusMonitorProcListProps = (
  dbsMethods: AppContextProps["dbsMethods"],
  toggledFields: string[],
  connectionId: string,
  noBash: boolean,
) => {
  return useMemo(() => {
    const actionRow = {
      name: "id_query_hash",
      className: "ml-auto show-on-parent-hover",
      label: "",
      renderMode: "valueNode",
      render: (id_query_hash, row) =>
        !dbsMethods.killPID ?
          <div></div>
        : <FlexRow className="">
            <Btn
              title="Cancel this query"
              iconPath={mdiStopCircleOutline}
              color="danger"
              onClickPromise={async () => {
                await dbsMethods.killPID!({
                  connId: connectionId,
                  id_query_hash,
                  type: "cancel",
                });
              }}
            />
            <Btn
              title="Terminate this query"
              iconPath={mdiCancel}
              color="danger"
              onClickPromise={async () => {
                await dbsMethods.killPID!({
                  connId: connectionId,
                  id_query_hash,
                  type: "terminate",
                });
              }}
            />
          </FlexRow>,
    } satisfies FieldConfigs[number];

    const hideOverflowStyle = { style: { overflow: "hidden" } };
    const fixedFields = [
      {
        name: "cpu",
        hide: noBash,
        ...hideOverflowStyle,
        render: (v: number) => <span className="">{v}%</span>,
      },
      {
        name: "mem",
        hide: noBash,
        renderMode: "value",
        ...hideOverflowStyle,
        render: (v: number) => <span className="">{v}%</span>,
      },
      {
        name: "state",
        ...hideOverflowStyle,
        label: "State",
        renderMode: "valueNode",
        render: (state) => {
          return (
            <Chip
              className="mt-p25"
              color={
                state === "idle" ? "yellow"
                : state === "active" ?
                  "blue"
                : undefined
              }
            >
              {state ?? "unknown"}
            </Chip>
          );
        },
      },
      {
        name: "blocked_by",
        ...hideOverflowStyle,
        label: "Blocked by pids",
        hideIf: (value) => !value?.length,
        renderMode: "valueNode",
        render: (blocked_by) => (
          <FlexRow>
            {blocked_by?.map((pid) => (
              <StatusMonitorBlockedByPid key={pid} pid={pid} />
            ))}
          </FlexRow>
        ),
      } satisfies FieldConfig<DBSSchema["stats"], "blocked_by">,
      {
        name: "running_time",
        ...hideOverflowStyle,
        label: "Running time",
        select: { $ageNow: ["query_start"] },
        render: (value) => <StyledInterval value={value} mode="pg_stat" />,
      },
      { name: "pid" },
      { name: "backend_xid" },
      actionRow,
      {
        name: "query",
        className: "w-full",
        render: (query, row) => (
          <PopupMenu
            key={row.pid}
            button={<div>{query}</div>}
            positioning="center"
            title={`PID: ${row.pid}`}
          >
            <CodeExample
              value={query}
              language="sql"
              style={{
                minWidth: "450px",
                minHeight: "450px",
              }}
            />
          </PopupMenu>
        ),
      },
    ] satisfies FieldConfigs; //<DBSSchema["stats"]>[];

    const excludedFields = [
      ...fixedFields
        .filter((f) => (f as any).render)
        .map((f) => f.name as keyof DBSSchema["stats"]),
      "connection_id",
    ];

    const fieldConfigs = [
      ...fixedFields.filter((ff) => !toggledFields.includes(ff.name)),
      ...toggledFields,
    ];

    return { fieldConfigs, excludedFields };
  }, [dbsMethods, toggledFields, connectionId, noBash]);
};
