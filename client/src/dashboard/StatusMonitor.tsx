import { mdiCancel, mdiDotsHorizontal, mdiInformationOutline, mdiStopCircleOutline } from "@mdi/js";
import React, { useEffect, useState } from "react";
import { DBSSchema } from "../../../commonTypes/publishUtils";
import { ConnectionStatus } from "../../../commonTypes/utils";
import { PrglState, Theme } from "../App";
import Btn from "../components/Btn";
import ButtonGroup from "../components/ButtonGroup";
import Chip from "../components/Chip";
import { ExpandSection } from "../components/ExpandSection";
import { FlexCol, FlexRow, FlexRowWrap } from "../components/Flex";
import FormField from "../components/FormField/FormField";
import { InfoRow } from "../components/InfoRow";
import PopupMenu from "../components/PopupMenu";
import Select from "../components/Select/Select";
import { Table } from "../components/Table/Table";
import { getServerCoreInfoStr } from "../pages/Connections/Connections";
import { bytesToSize } from "./Backup/BackupsControls";
import { useIsMounted } from "./Backup/CredentialSelector";
import CodeExample from "./CodeExample";
import { DBSMethods } from "./Dashboard/DBS";
import { usePromise } from "./ProstglesMethod/hooks";
import { StyledInterval } from "./ProstglesSQL/customRenderers";
import SmartCardList, { SmartCardListProps } from "./SmartCard/SmartCardList";

type P = Pick<PrglState, "dbs" | "dbsMethods" | "dbsTables"> & {
  connectionId: string;
  theme: Theme
  getStatus: Required<DBSMethods>["getStatus"];
}

const ViewTypes = ["Queries", "Active queries", "Blocked queries"] as const;
type ViewType = typeof ViewTypes[number];

type FieldConfigs = Required<SmartCardListProps>["fieldConfigs"];

const getFixedFieldConfigs = (dbsMethods: PrglState["dbsMethods"], theme: Theme, connectionId: string, noBash: boolean) => {

  const actionRow = { 
    name: "id_query_hash", 
    className: "ml-auto show-on-parent-hover", 
    label: "",
    render: (id_query_hash, row) => 
      !dbsMethods.killPID? <div></div> : 
      <FlexRow className="">
        <Btn 
          title="Cancel this query"
          iconPath={mdiStopCircleOutline} 
          color="danger" 
          onClickPromise={() => dbsMethods.killPID!(connectionId, id_query_hash, "cancel")} 
        /> 
        <Btn 
          title="Terminate this query"
          iconPath={mdiCancel} 
          color="danger" 
          onClickPromise={() => dbsMethods.killPID!(connectionId, id_query_hash, "terminate")} 
        /> 
      </FlexRow>
  } satisfies FieldConfigs[number];

  const hideOverflowStyle = { style: { overflow: "hidden" } };
  const fieldConfigs = [
    { name: "cpu", hide: noBash, ...hideOverflowStyle, renderValue: (v: number) => <span className="">{v}%</span> }, 
    { name: "mem", hide: noBash, ...hideOverflowStyle, renderValue: (v: number) => <span className="">{v}%</span> },
    { 
      name: "state", ...hideOverflowStyle, 
      render: state => 
        <Chip className="mt-p25"
          color={state === "idle"? "yellow" : state === "active"? "blue" : undefined}
        >
          {state}
        </Chip> 
    },
    { 
      name: "running_time", ...hideOverflowStyle, 
      select: { $ageNow: ["query_start"] },
      renderValue: value => 
        <StyledInterval
          value={value} 
          mode="pg_stat" 
        />  
    },
    { name: "pid" },
    {
      name: "blocked_by", ...hideOverflowStyle, 
      hideIf: (value) => !value?.length,
      // render: (val, row) => <div>

      // </div>
    },
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
            options={{
              theme: theme === "dark"? "vs-dark" : "vs-light"
            }}
            style={{
              minWidth: "450px",
              minHeight: "450px",
            }} 
          />
        </PopupMenu> 
      )
    },

  ] satisfies FieldConfigs;


  return { 
    fieldConfigs, 
    // actionRow 
  };
}

export const StatusMonitor = ({ getStatus, connectionId, dbs, dbsMethods, dbsTables, theme }: P ) => {

  const [viewType, setViewType] = useState<ViewType>(ViewTypes[0]);
  const [refreshRate, setRefreshRate] = useState(1);
  const [c, setc] = useState<ConnectionStatus>();
  const getIsMounted = useIsMounted();
  useEffect(() => {
    const interval = setInterval(async () => {
      const c = await getStatus(connectionId) 
      if(!getIsMounted()){
        return;
      }
      setc(c);
    }, refreshRate * 1e3);

    return () => clearInterval(interval);

  }, [refreshRate, connectionId, getStatus, getIsMounted]);


  const [toggledFields, setToggledFields] = useState<string[]>([]);
  const { fieldConfigs: fixedFields } = getFixedFieldConfigs(dbsMethods, theme, connectionId, c?.noBash ?? true);
  const excludedFields: (keyof DBSSchema["stats"])[] = fixedFields
    .filter(f => (f as any).render || (f as any).renderValue)
    .map(f => f.name).concat(["connection_id"]) as any;
  const statColumns = (dbsTables.find(t => t.name === "stats")?.columns ?? [])
  const toggleableFields = statColumns.filter(c => !excludedFields.includes(c.name as any) );
  const fieldConfigs = [
    ...fixedFields.filter(ff => !toggledFields.includes(ff.name)),
    ...toggledFields,
  ];
  const allToggledFields = fieldConfigs.filter(f => typeof f === "string" || !(f as any).hide && !(f as any).hideIf).map(f => typeof f === "string"? f : f.name);
  
  // const [shellResult, setShellResult] = useState("");
  // const setShell = async (v: string) => {
  //   const res = await execPSQLBash(dbs.sql!, connectionId, v);
  //   console.log(res);
  //   setShellResult(res.join("\n"));
  //   getPidStats(dbs.sql!, connectionId);
  // }

  const connNum = c?.connections.length;
  const maxConnNum = c?.maxConnections;
  const connection = usePromise(() => dbs.connections.findOne({ id: connectionId }))

  return <FlexCol className="StatusMonitor min-w-0 jc-start">
    <InfoRow>Some queries used for this view have been hidden</InfoRow>
    
    <FlexRow>
      {connection && 
        <Chip 
          variant="header" 
          label="Server"
        >
          {getServerCoreInfoStr(connection)}
        </Chip>
      }
      {c?.serverStatus && 
        <Chip 
          className="f-0"
          variant="header" 
          label="Memory"
        >
          {(100 * c.serverStatus.free_memoryKb/c.serverStatus.total_memoryKb).toFixed(1).padStart(2, "0")}% ({bytesToSize(1024 * c.serverStatus.free_memoryKb)})
        </Chip>
      }
      {connNum !== undefined && maxConnNum !== undefined && 
        <PopupMenu
          className="f-0"
          button={
            <Chip 
              className="noselect pointer"
              label={"Connections"}
              variant="header"
              color={(maxConnNum-connNum)/maxConnNum > .5? "green" : "yellow"}
            >
              {c?.connections.length}/{c?.maxConnections}
            </Chip>}
        >
          <Table
            cols={Object.keys(c?.connections[0] ?? {}).map(key => ({ key, filter: false, label: key, name: key, sortable: true, tsDataType: "string", udt_name: "text" }))}
            rows={c?.connections ?? []}
          />
        </PopupMenu>
      }
      {c?.serverStatus && <PopupMenu
        title="Server info"
        className="f-0"
        positioning="center"
        clickCatchStyle={{ opacity: .5 }}
        contentClassName="flex-col gap-1 p-1"
        button={
          <Btn 
            title="Server information" 
            iconPath={mdiInformationOutline} 
          />  
        }
      >
        <Chip
          label={"CPU Model"}
          variant="header"
        >
          {c.serverStatus.cpu_model}
          <br>
          </br>
          {c.serverStatus.cpu_mhz}
        </Chip>
        <Chip
          label={"CPU Frequency"}
          variant="header"
        >
          {c.serverStatus.cpu_cores_mhz}
        </Chip>
        <Chip
          label={"Disk usage"}
          variant="header"
        >
          {c.serverStatus.disk_space}
        </Chip>
      </PopupMenu>}
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
          borderRadius: 0
        }
      }}
      noDataComponent={
        <InfoRow color="info" variant="filled">No {viewType}</InfoRow>
      }
      title={
        <FlexRowWrap className="f-1 ai-end">
          <ButtonGroup 
            variant="select"
            value={viewType} 
            options={ViewTypes} 
            onChange={setViewType} 
          />

          <ExpandSection iconPath={mdiDotsHorizontal}>  
            <Select
              btnProps={{
                children: "Fields..."
              }}
              multiSelect={true}
              fullOptions={toggleableFields.map(c => ({
                key: c.name,
                label: c.label,
                subLabel: c.hint,
                disabledInfo: excludedFields.includes(c.name as any)? "Cannot toggle this field" : undefined,
              }))}
              value={allToggledFields}
              onChange={setToggledFields}
            />

            <FormField 
              className="ml-auto"
              label={"Refresh rate"} 
              type="number" 
              value={refreshRate} 
              onChange={v => v > 1? setRefreshRate(v) : undefined} 
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
            ...(
              viewType === "Blocked queries"? 
                { blocked_by_num: { ">" : 0 } } : 
              viewType === "Active queries"? 
                { state: "active" } : 
                {}
              )
            // state: { "<>": "idle" }
          },
          ...(viewType === "Blocked queries"? [
            { blocked_by_num: { ">" : 0 } }
          ] : [

          ]),
        ] 
      }}
      fieldConfigs={fieldConfigs}
    />
    
  </FlexCol>
}
