
import {
  mdiAccountMultiple, mdiApplicationBracesOutline, mdiChartLine,
  mdiDatabaseSync, mdiImage, mdiLanguageTypescript, mdiPencil, mdiTableEdit,
} from "@mdi/js";
import React from "react";
import { useSearchParams } from "react-router-dom";
import { Prgl } from "../../App";
import { dataCommand } from "../../Testing";
import Tabs, { TabItems } from "../../components/Tabs";
import NewConnection from "../../pages/NewConnection/NewConnnection";
import { Connections } from "../../pages/Project";
import { TopControls } from "../../pages/TopControls";
import { APIDetails } from "../ConnectionConfig/APIDetails/APIDetails";
import { AccessControl } from "../AccessControl/AccessControl";
import BackupsControls from "../Backup/BackupsControls";
import { PublishedMethods } from "../ProstglesMethod/PublishedMethods";
import { getKeys } from "../SmartForm/SmartForm";
import { StatusMonitor } from "../StatusMonitor";
import { FileTableConfigControls } from "../FileTableControls/FileTableConfigControls";
import { FlexRow } from "../../components/Flex";
import { Icon } from "../../components/Icon/Icon";
import { TableConfig } from "../TableConfig/TableConfig";
import { useSubscribeOne } from "prostgles-client/dist/react-hooks";

type ConnectionConfigProps = Pick<React.HTMLAttributes<HTMLDivElement>, "style" | "className" | "children"> & {
  connection: Connections;
  prgl: Prgl;
}

export const ConnectionConfig = (props: ConnectionConfigProps) => {
  const { className = "", style = {}, prgl } = props;
  const { serverState, dbs, connectionId, db, dbsMethods } = prgl;
  const [searchParams, setSearchParams] = useSearchParams();
  const dbConfig = useSubscribeOne(dbs.database_configs.subscribeOneHook({ $existsJoined: { connections: { id: connectionId } } }));
  const disabledText = (dbs as any).access_control?.update ? undefined : "Must be admin to access this";
  const { isElectron } = serverState;
  const sectionItems: TabItems = {
    details: {
      label: "Connection details",
      leftIconPath: mdiPencil,
      disabledText,
      listProps: dataCommand("config.details"),
      content: <NewConnection 
        showTitle={false}
        prglState={props.prgl}
        contentOnly={true}
        db={db}
        connectionId={connectionId}
      />
    },
    status: {
      label: "Status monitor",
      listProps: dataCommand("config.status"),
      leftIconPath: mdiChartLine,
      disabledText: !dbsMethods.getStatus ? "Must be admin to access this" : undefined,
      content: !dbsMethods.getStatus ? null : 
        <StatusMonitor
          {...prgl}
          theme={prgl.theme}
          getStatus={dbsMethods.getStatus}
        />
    },
    access_control: {
      label: "Access control",
      listProps: dataCommand("config.ac"),
      leftIconPath: mdiAccountMultiple,
      disabledText: disabledText || (isElectron ? "Not available for desktop" : undefined),
      content: <AccessControl
        className="min-h-0"
        prgl={prgl}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
      />
    },
    methods: {
      label: "TS Functions",
      listProps: dataCommand("config.methods"),
      leftIconPath: mdiLanguageTypescript,
      content: <PublishedMethods
        prgl={prgl}
        forAccessRule={undefined}
      />
    },
    file_storage: {
      label: "File storage",
      listProps: dataCommand("config.files"),
      leftIconPath: mdiImage,
      disabledText: disabledText || (isElectron ? "Not available for desktop" : undefined),
      content: <FileTableConfigControls {...props} />
    },
    backups: {
      label: "Backup/Restore",
      listProps: dataCommand("config.bkp"),
      leftIconPath: mdiDatabaseSync,
      disabledText,
      content: <BackupsControls {...props} />
    },
    API: {
      label: "API",
      listProps: dataCommand("config.api"),
      leftIconPath: mdiApplicationBracesOutline,
      disabledText: disabledText || (isElectron ? "Not available for desktop" : undefined),
      content: <APIDetails { ...props.prgl } />
    },
    table_config: {
      label: "Table config (experimental)",
      listProps: dataCommand("config.tableConfig"),
      leftIconPath: mdiTableEdit,
      hide: (!dbsMethods.setTableConfig || !localStorage.getItem("featureFlags")) && !dbConfig?.table_config && !dbConfig?.table_config_ts,
      content: <TableConfig {...props} />
    },
  }

  const sectionItemKeys = getKeys(sectionItems);

  return <div className={`flex-col f-1 min-s-0 bg-gray-800 ${className}`} style={style}>

    <TopControls
      location="config"
      prgl={props.prgl}
    />

    <div className="flex-col f-1 min-h-0 as-center  bg-1 w-full pt-1">
      <Tabs variant={{ controlsBreakpoint: 200, contentBreakpoint: 500, controlsCollapseWidth: 350 }}
        className="f-1 as-center w-full shadow"
        style={{ maxWidth: "1200px" }}
        activeKey={sectionItemKeys.find(s => s === searchParams.get("section")) ?? sectionItemKeys[0]}
        onChange={section => { setSearchParams({ section: section as string }) }}
        items={sectionItems}
        contentClass="o-auto flex-row jc-center bg-1 f-1"
        onRender={item =>
          <div className="flex-col f-1  min-w-0 bg-0 shadow">
            <FlexRow
              className="w-full text-0"
              style={{
                paddingLeft: window.isLowWidthScreen ? "16px" : "32px"
              }}
            >
              {item.leftIconPath && <Icon size={1.5} path={item.leftIconPath} />}
              <h2>
                {item.label}
              </h2>

            </FlexRow>
            <div className={" f-1 o-auto flex-row w-full " + (window.isLowWidthScreen ? "p-1" : " p-2  ")}
              style={{ alignSelf: "stretch" }}
            >
              {item.content}
            </div>
          </div>
        }
      />
    </div>
  </div>

}