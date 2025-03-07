import {
  mdiAccountMultiple,
  mdiApplicationBracesOutline,
  mdiChartLine,
  mdiDatabaseSync,
  mdiImage,
  mdiLanguageTypescript,
  mdiPencil,
  mdiTableEdit,
} from "@mdi/js";
import React from "react";
import type { CONNECTION_CONFIG_SECTIONS } from "../../../../commonTypes/utils";
import type { Prgl } from "../../App";
import { dataCommand } from "../../Testing";
import { FlexCol, FlexRow } from "../../components/Flex";
import { Icon } from "../../components/Icon/Icon";
import type { TabItem } from "../../components/Tabs";
import Tabs from "../../components/Tabs";
import NewConnection from "../../pages/NewConnection/NewConnnection";
import type { Connections } from "../../pages/ProjectConnection/ProjectConnection";
import { TopControls } from "../../pages/TopControls";
import { getKeys } from "../../utils";
import { AccessControl } from "../AccessControl/AccessControl";
import { useAccessControlSearchParams } from "../AccessControl/useAccessControlSearchParams";
import { BackupsControls } from "../Backup/BackupsControls";
import { APIDetails } from "../ConnectionConfig/APIDetails/APIDetails";
import { FileTableConfigControls } from "../FileTableControls/FileTableConfigControls";
import { StatusMonitor } from "../StatusMonitor";
import { TableConfig } from "../TableConfig/TableConfig";
import { PublishedMethods } from "../W_Method/PublishedMethods";
import { OnMountFunction } from "./OnMountFunction";
import { useConnectionConfigSearchParams } from "./useConnectionConfigSearchParams";
import { t } from "../../i18n/i18nUtils";

type ConnectionConfigProps = Pick<
  React.HTMLAttributes<HTMLDivElement>,
  "style" | "className" | "children"
> & {
  connection: Connections;
  prgl: Prgl;
};

export const ConnectionConfig = (props: ConnectionConfigProps) => {
  const { className = "", style = {}, prgl } = props;
  const { serverState, dbs, connectionId, db, dbsMethods } = prgl;
  const disabledText =
    (dbs.access_control as any)?.update ?
      undefined
    : t.ConnectionConfig["Must be admin to access this"];
  const { isElectron } = serverState;
  const acParams = useAccessControlSearchParams();
  const sectionItems = {
    details: {
      label: t.ConnectionConfig["Connection details"],
      leftIconPath: mdiPencil,
      disabledText,
      listProps: dataCommand("config.details"),
      content: (
        <NewConnection
          showTitle={false}
          prglState={props.prgl}
          contentOnly={true}
          db={db}
          connectionId={connectionId}
        />
      ),
    },
    status: {
      label: t.ConnectionConfig["Status monitor"],
      listProps: dataCommand("config.status"),
      leftIconPath: mdiChartLine,
      disabledText:
        !dbsMethods.getStatus ? "Must be admin to access this" : undefined,
      content:
        !dbsMethods.getStatus || !dbsMethods.runConnectionQuery ?
          null
        : <StatusMonitor
            {...prgl}
            theme={prgl.theme}
            getStatus={dbsMethods.getStatus}
            runConnectionQuery={dbsMethods.runConnectionQuery}
          />,
    },
    access_control: {
      label: t.ConnectionConfig["Access control"],
      listProps: dataCommand("config.ac"),
      leftIconPath: mdiAccountMultiple,
      disabledText:
        disabledText || (isElectron ? "Not available for desktop" : undefined),
      content: <AccessControl className="min-h-0" prgl={prgl} {...acParams} />,
    },
    file_storage: {
      label: t.ConnectionConfig["File storage"],
      listProps: dataCommand("config.files"),
      leftIconPath: mdiImage,
      disabledText:
        disabledText || (isElectron ? "Not available for desktop" : undefined),
      content: <FileTableConfigControls {...props} />,
    },
    backups: {
      label: t.ConnectionConfig["Backup/Restore"],
      listProps: dataCommand("config.bkp"),
      leftIconPath: mdiDatabaseSync,
      disabledText,
      content: <BackupsControls {...props} />,
    },
    API: {
      label: t.ConnectionConfig["API"],
      listProps: dataCommand("config.api"),
      leftIconPath: mdiApplicationBracesOutline,
      disabledText:
        disabledText || (isElectron ? "Not available for desktop" : undefined),
      content: <APIDetails {...props.prgl} />,
    },
    table_config: {
      label: (
        <>
          {t.ConnectionConfig["Table config"]}{" "}
          <span className="text-2 font-14">
            {t.ConnectionConfig.experimental}
          </span>
        </>
      ),
      listProps: dataCommand("config.tableConfig"),
      leftIconPath: mdiTableEdit,
      content: <TableConfig {...props} />,
    },
    methods: {
      label: (
        <>
          {t.ConnectionConfig["Server-side functions"]}{" "}
          <span className="text-2 font-14">
            ({t.ConnectionConfig.experimental})
          </span>
        </>
      ),
      listProps: dataCommand("config.methods"),
      leftIconPath: mdiLanguageTypescript,
      content: (
        <FlexCol className="w-full" style={{ gap: "2em" }}>
          <OnMountFunction {...prgl} />
          <PublishedMethods
            prgl={prgl}
            editedRule={undefined}
            accessRuleId={undefined}
          />
        </FlexCol>
      ),
    },
  } as const satisfies Record<
    (typeof CONNECTION_CONFIG_SECTIONS)[number],
    TabItem
  >;
  const { activeSection, setSection } = useConnectionConfigSearchParams(
    getKeys(sectionItems),
  );

  return (
    <div className={`flex-col f-1 min-s-0 ${className}`} style={style}>
      <TopControls location="config" prgl={props.prgl} />

      <div className="flex-col f-1 min-h-0 as-center  bg-color-2 w-full pt-1">
        <Tabs
          variant={{
            controlsBreakpoint: 200,
            contentBreakpoint: 500,
            controlsCollapseWidth: 350,
          }}
          className="f-1 as-center w-full shadow"
          style={{ maxWidth: "1200px" }}
          activeKey={activeSection}
          compactMode={window.isMediumWidthScreen ? "hide-label" : undefined}
          onChange={(section) => {
            setSection({ section });
          }}
          items={sectionItems}
          contentClass="o-auto flex-row jc-center bg-color-2 f-1"
          onRender={(item) => (
            <div className="flex-col f-1  min-w-0 bg-color-0 shadow">
              <FlexRow
                className="w-full text-0"
                style={{
                  paddingLeft: window.isLowWidthScreen ? "16px" : "32px",
                }}
              >
                {item.leftIconPath && (
                  <Icon size={1.5} path={item.leftIconPath} />
                )}
                <h2>{item.label}</h2>
              </FlexRow>
              <div
                className={
                  " f-1 o-auto flex-row w-full " +
                  (window.isLowWidthScreen ? "p-1" : " p-2  ")
                }
                style={{ alignSelf: "stretch" }}
              >
                {item.content}
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};
