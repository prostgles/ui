import {
  mdiCancel,
  mdiChartLine,
  mdiDotsHorizontal,
  mdiFilter,
  mdiStopCircleOutline,
} from "@mdi/js";
import { usePromise } from "prostgles-client/dist/react-hooks";
import React, { useEffect, useState } from "react";
import type { DBSSchema } from "../../../commonTypes/publishUtils";
import type { ConnectionStatus } from "../../../commonTypes/utils";
import type { PrglState, Theme } from "../App";
import Btn from "../components/Btn";
import ButtonGroup from "../components/ButtonGroup";
import Chip from "../components/Chip";
import ErrorComponent from "../components/ErrorComponent";
import { ExpandSection } from "../components/ExpandSection";
import { FlexCol, FlexRow, FlexRowWrap } from "../components/Flex";
import FormField from "../components/FormField/FormField";
import { InfoRow } from "../components/InfoRow";
import PopupMenu from "../components/PopupMenu";
import Select from "../components/Select/Select";
import { getServerCoreInfoStr } from "../pages/Connections/Connections";
import { isEmpty } from "../utils";
import { bytesToSize } from "./Backup/BackupsControls";
import { useIsMounted } from "./Backup/CredentialSelector";
import CodeExample from "./CodeExample";
import type { DBSMethods } from "./Dashboard/DBS";
import type { SmartCardListProps } from "./SmartCard/SmartCardList";
import SmartCardList from "./SmartCard/SmartCardList";
import { StatusMonitorConnections } from "./StatusMonitor/StatusMonitorConnections";
import { StyledInterval } from "./W_SQL/customRenderers";

export type StatusMonitorProps = Pick<
  PrglState,
  "dbs" | "dbsMethods" | "dbsTables"
> & {
  connectionId: string;
  theme: Theme;
  getStatus: Required<DBSMethods>["getStatus"];
  runConnectionQuery: Required<DBSMethods>["runConnectionQuery"];
};

const ViewTypes = ["Queries", "Active queries", "Blocked queries"] as const;
type ViewType = (typeof ViewTypes)[number];

export const StatusMonitor = ({
  getStatus,
  connectionId,
  dbs,
  dbsMethods,
  dbsTables,
  theme,
  runConnectionQuery,
}: StatusMonitorProps) => {
  const [viewType, setViewType] = useState<ViewType>(ViewTypes[1]);
  const [refreshRate, setRefreshRate] = useState(1);
  const [c, setc] = useState<ConnectionStatus>();
  const getIsMounted = useIsMounted();
  const [statusError, setStatusError] = useState<any>();
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const c = await getStatus(connectionId);
        if (!getIsMounted()) {
          return;
        }
        setc(c);
        if (!isEmpty(c.getPidStatsErrors)) {
          console.error(c.getPidStatsErrors);
        }
      } catch (e) {
        console.error(e);
        setStatusError(e);
      }
    }, refreshRate * 1e3);

    return () => clearInterval(interval);
  }, [refreshRate, connectionId, getStatus, getIsMounted]);

  const [toggledFields, setToggledFields] = useState<string[]>([]);
  const { fieldConfigs: fixedFields } = getFixedFieldConfigs(
    dbsMethods,
    theme,
    connectionId,
    c?.noBash ?? true,
  );
  const excludedFields: (keyof DBSSchema["stats"])[] = fixedFields
    .filter((f) => (f as any).render || (f as any).renderValue)
    .map((f) => f.name)
    .concat(["connection_id"]) as any;
  const statColumns = dbsTables.find((t) => t.name === "stats")?.columns ?? [];
  // const toggleableFields = statColumns.filter(c => !excludedFields.includes(c.name as any) );
  const fieldConfigs = [
    ...fixedFields.filter((ff) => !toggledFields.includes(ff.name)),
    ...toggledFields,
  ];
  const allToggledFields = fieldConfigs
    .filter(
      (f) => typeof f === "string" || (!(f as any).hide && !(f as any).hideIf),
    )
    .map((f) => (typeof f === "string" ? f : f.name));

  // const [shellResult, setShellResult] = useState("");
  // const setShell = async (v: string) => {
  //   const res = await execPSQLBash(dbs.sql!, connectionId, v);
  //   console.log(res);
  //   setShellResult(res.join("\n"));
  //   getPidStats(dbs.sql!, connectionId);
  // }

  const { data: connection } = dbs.connections.useFindOne({ id: connectionId });
  const [datidFilter, setDatidFilter] = useState<number | undefined>();

  usePromise(async () => {
    const datids = await runConnectionQuery(
      connectionId,
      `SELECT datid
      FROM pg_catalog.pg_stat_database
      WHERE datname = current_database()
    `,
    );
    if (datids.length === 1) {
      setDatidFilter(datids[0]?.datid);
    }
  }, [runConnectionQuery, connectionId]);

  return (
    <FlexCol className="StatusMonitor min-w-0 jc-start">
      <InfoRow>Some queries used for this view have been hidden</InfoRow>
      {statusError && <ErrorComponent error={statusError} />}
      <FlexRow>
        {connection && (
          <Chip variant="header" label="Server">
            {getServerCoreInfoStr(connection)}
          </Chip>
        )}
        {c?.serverStatus && (
          <Chip className="f-0" variant="header" label="Memory used">
            {(
              (100 *
                (c.serverStatus.total_memoryKb - c.serverStatus.memAvailable)) /
              c.serverStatus.total_memoryKb
            )
              .toFixed(1)
              .padStart(2, "0")}
            % (
            {bytesToSize(
              1024 *
                (c.serverStatus.total_memoryKb - c.serverStatus.memAvailable),
            )}
            )
          </Chip>
        )}
        {c && (
          <StatusMonitorConnections
            c={c}
            datidFilter={datidFilter}
            dbsMethods={dbsMethods}
            connectionId={connectionId}
            onSetDatidFilter={setDatidFilter}
          />
        )}
        {c?.serverStatus && (
          <PopupMenu
            title="Server info"
            className="f-0"
            positioning="center"
            clickCatchStyle={{ opacity: 0.5 }}
            contentClassName="flex-col gap-1 p-1"
            button={<Btn title="Server information" iconPath={mdiChartLine} />}
          >
            <Chip label={"CPU Model"} variant="header">
              <span className="ws-pre">
                {c.serverStatus.cpu_model}
                <br></br>
                {c.serverStatus.cpu_mhz}
              </span>
            </Chip>
            <Chip label={"CPU Frequency"} variant="header">
              <div className="ws-pre ta-right">
                {c.serverStatus.cpu_cores_mhz}
              </div>
            </Chip>
            <Chip label={"Disk usage"} variant="header">
              <span className="ws-pre">{c.serverStatus.disk_space}</span>
            </Chip>
            {(c.serverStatus.ioInfo?.length ?? 0) > 0 && (
              <FlexCol className="gap-0 p-p5">
                <span className="text-1 font-14 ta-left">IO: </span>
                <table className="ta-left" style={{ borderSpacing: 0 }}>
                  <thead>
                    <tr>
                      <th>Device</th>
                      <th>Reads</th>
                      <th>Writes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.serverStatus.ioInfo?.map((r) => (
                      <tr key={r.deviceName}>
                        <td>{r.deviceName}</td>
                        <td>{bytesToSize(r.readsCompletedSuccessfully)}</td>
                        <td>{bytesToSize(r.writesCompleted)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </FlexCol>
            )}
          </PopupMenu>
        )}
      </FlexRow>

      {/* <FormFieldDebounced onChange={setShell} />
    <div className="ws-pre">{shellResult}</div> */}

      <SmartCardList
        theme={theme}
        db={dbs as any}
        methods={dbsMethods}
        tables={dbsTables}
        tableName="stats"
        showEdit={false}
        showTopBar={{ sort: true }}
        orderBy={{ cpu: false }}
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
        title={
          <FlexRowWrap className="f-1 ai-end">
            <ButtonGroup
              variant="select"
              value={viewType}
              options={ViewTypes}
              onChange={setViewType}
            />
            {datidFilter && (
              <Chip
                label="Database ID"
                leftIcon={{ path: mdiFilter }}
                color="blue"
                onDelete={() => setDatidFilter(undefined)}
              >
                {datidFilter}
              </Chip>
            )}
            <ExpandSection iconPath={mdiDotsHorizontal}>
              <Select
                btnProps={{
                  children: "Fields...",
                }}
                multiSelect={true}
                fullOptions={statColumns.map((c) => ({
                  key: c.name,
                  label: c.label,
                  subLabel: c.hint,
                  disabledInfo:
                    excludedFields.includes(c.name as any) ?
                      "Cannot toggle this field"
                    : undefined,
                }))}
                value={allToggledFields}
                onChange={setToggledFields}
              />

              <FormField
                className="ml-auto"
                label={"Refresh rate"}
                type="number"
                value={refreshRate}
                onChange={(v) => (v > 1 ? setRefreshRate(v) : undefined)}
                inputProps={{ min: 1, max: 100, step: 1 }}
              />
            </ExpandSection>
          </FlexRowWrap>
        }
        realtime={true}
        throttle={500}
        filter={{
          $and: [
            {
              connection_id: connectionId,
              ...(datidFilter ? { datid: datidFilter } : {}),
              ...(viewType === "Blocked queries" ?
                { blocked_by_num: { ">": 0 } }
              : viewType === "Active queries" ? { state: "active" }
              : {}),
              // state: { "<>": "idle" }
            },
            ...(viewType === "Blocked queries" ?
              [{ blocked_by_num: { ">": 0 } }]
            : []),
          ],
        }}
        fieldConfigs={fieldConfigs}
      />
    </FlexCol>
  );
};

type FieldConfigs = Required<SmartCardListProps>["fieldConfigs"];

const getFixedFieldConfigs = (
  dbsMethods: PrglState["dbsMethods"],
  theme: Theme,
  connectionId: string,
  noBash: boolean,
) => {
  const actionRow = {
    name: "id_query_hash",
    className: "ml-auto show-on-parent-hover",
    label: "",
    render: (id_query_hash, row) =>
      !dbsMethods.killPID ?
        <div></div>
      : <FlexRow className="">
          <Btn
            title="Cancel this query"
            iconPath={mdiStopCircleOutline}
            color="danger"
            onClickPromise={() =>
              dbsMethods.killPID!(connectionId, id_query_hash, "cancel")
            }
          />
          <Btn
            title="Terminate this query"
            iconPath={mdiCancel}
            color="danger"
            onClickPromise={() =>
              dbsMethods.killPID!(connectionId, id_query_hash, "terminate")
            }
          />
        </FlexRow>,
  } satisfies FieldConfigs[number];

  const hideOverflowStyle = { style: { overflow: "hidden" } };
  const fieldConfigs = [
    {
      name: "cpu",
      hide: noBash,
      ...hideOverflowStyle,
      renderValue: (v: number) => <span className="">{v}%</span>,
    },
    {
      name: "mem",
      hide: noBash,
      ...hideOverflowStyle,
      renderValue: (v: number) => <span className="">{v}%</span>,
    },
    {
      name: "state",
      ...hideOverflowStyle,
      label: "State",
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
      render: (pids, row) => (
        <FlexRow>
          {pids?.map((pid, i) => (
            <Chip key={pid} className="mt-p25" color="red">
              {pid}
            </Chip>
          ))}
        </FlexRow>
      ),
    },
    {
      name: "running_time",
      ...hideOverflowStyle,
      label: "Running time",
      select: { $ageNow: ["query_start"] },
      renderValue: (value) => <StyledInterval value={value} mode="pg_stat" />,
    },
    { name: "pid" },
    actionRow,
    {
      name: "query",
      className: "w-full",
      renderValue: (query, row) => (
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
  ] satisfies FieldConfigs;

  return {
    fieldConfigs,
  };
};
