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
import React, { useMemo } from "react";
import type { CONNECTION_CONFIG_SECTIONS } from "@common/utils";
import { dataCommand } from "../../Testing";
import { FlexRow } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import type { TabItem } from "@components/Tabs";
import Tabs from "@components/Tabs";
import { t } from "../../i18n/i18nUtils";
import NewConnection from "../../pages/NewConnection/NewConnnectionForm";
import { usePrgl } from "../../pages/ProjectConnection/PrglContextProvider";
import type { Connections } from "../../pages/ProjectConnection/ProjectConnection";
import { TopControls } from "../../pages/TopControls";
import { getKeys } from "../../utils";
import { AccessControl } from "../AccessControl/AccessControl";
import { useAccessControlSearchParams } from "../AccessControl/useAccessControlSearchParams";
import { BackupsControls } from "../BackupAndRestore/BackupsControls";
import { APIDetails } from "../ConnectionConfig/APIDetails/APIDetails";
import { FileTableConfigControls } from "../FileTableControls/FileTableConfigControls";
import { StatusMonitor } from "../StatusMonitor/StatusMonitor";
import { TableConfig } from "../TableConfig/TableConfig";
import { ServerSideFunctions } from "./ServerSideFunctions";
import { useConnectionConfigSearchParams } from "./useConnectionConfigSearchParams";

type ConnectionConfigProps = Pick<
  React.HTMLAttributes<HTMLDivElement>,
  "style" | "className" | "children"
> & {
  connection: Connections;
};

export const ConnectionConfig = (props: ConnectionConfigProps) => {
  const { className = "", style = {}, connection } = props;
  const prgl = usePrgl();
  const { serverState, dbs, connectionId, db, dbsMethods } = prgl;
  const propsWithPrgl = useMemo(() => ({ ...props, prgl }), [props, prgl]);
  const disabledText =
    (dbs.access_control as any)?.update ?
      undefined
    : t.ConnectionConfig["Must be admin to access this"];
  const stateDisabledInfo =
    connection.is_state_db ?
      t.TopControls["Not allowed for state database"]
    : undefined;
  const { isElectron } = serverState;

  const acParams = useAccessControlSearchParams();
  const sectionItems = useMemo(
    () =>
      ({
        details: {
          label: t.ConnectionConfig["Connection details"],
          leftIconPath: mdiPencil,
          disabledText: disabledText || stateDisabledInfo,
          listProps: dataCommand("config.details"),
          content: (
            <NewConnection
              showTitle={false}
              prglState={prgl}
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
                getStatus={dbsMethods.getStatus}
                runConnectionQuery={dbsMethods.runConnectionQuery}
              />,
        },
        access_control: {
          label: t.ConnectionConfig["Access control"],
          listProps: dataCommand("config.ac"),
          leftIconPath: mdiAccountMultiple,
          disabledText:
            disabledText ||
            stateDisabledInfo ||
            (isElectron ? "Not available for desktop" : undefined),
          content: (
            <AccessControl className="min-h-0" prgl={prgl} {...acParams} />
          ),
        },
        file_storage: {
          label: t.ConnectionConfig["File storage"],
          listProps: dataCommand("config.files"),
          leftIconPath: mdiImage,
          disabledText: disabledText || stateDisabledInfo,
          content: <FileTableConfigControls {...propsWithPrgl} />,
        },
        backups: {
          label: t.ConnectionConfig["Backup/Restore"],
          listProps: dataCommand("config.bkp"),
          leftIconPath: mdiDatabaseSync,
          disabledText,
          content: <BackupsControls {...propsWithPrgl} />,
        },
        API: {
          label: t.ConnectionConfig["API"],
          listProps: dataCommand("config.api"),
          leftIconPath: mdiApplicationBracesOutline,
          disabledText:
            disabledText ||
            (isElectron ? "Not available for desktop" : undefined),
          content: <APIDetails {...prgl} />,
        },
        table_config: {
          label: (
            <>
              {t.ConnectionConfig["Table config"]}{" "}
              <span className="text-2 font-14">
                ({t.ConnectionConfig.experimental})
              </span>
            </>
          ),
          disabledText: disabledText || stateDisabledInfo,
          listProps: dataCommand("config.tableConfig"),
          leftIconPath: mdiTableEdit,
          content: <TableConfig {...propsWithPrgl} />,
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
          disabledText: disabledText || stateDisabledInfo,
          listProps: dataCommand("config.methods"),
          leftIconPath: mdiLanguageTypescript,
          content: <ServerSideFunctions {...prgl} />,
        },
      }) as const satisfies Record<
        (typeof CONNECTION_CONFIG_SECTIONS)[number],
        TabItem
      >,
    [
      acParams,
      connectionId,
      db,
      dbsMethods.getStatus,
      dbsMethods.runConnectionQuery,
      disabledText,
      isElectron,
      prgl,
      propsWithPrgl,
      stateDisabledInfo,
    ],
  );
  const { activeSection, setSection } = useConnectionConfigSearchParams(
    getKeys(sectionItems),
  );

  return (
    <div className={`flex-col f-1 min-s-0 ${className}`} style={style}>
      <TopControls
        location="config"
        prgl={prgl}
        loadedSuggestions={undefined}
      />

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
