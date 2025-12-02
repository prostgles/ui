import { ROUTES, sliceText } from "@common/utils";
import Btn from "@components/Btn";
import ButtonGroup from "@components/ButtonGroup";
import { FlexCol } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { InfoRow } from "@components/InfoRow";
import {
  mdiBackupRestore,
  mdiDelete,
  mdiDownload,
  mdiGestureTapButton,
  mdiRefreshAuto,
} from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import { type AnyObject } from "prostgles-types";
import React from "react";
import type { Backups } from "../Dashboard/dashboardUtils";
import type { FieldConfig } from "../SmartCard/SmartCard";
import { SmartCardList } from "../SmartCardList/SmartCardList";
import { StyledInterval } from "../W_SQL/customRenderers";
import { bytesToSize } from "./BackupsControls";
import { CodeConfirmation } from "./CodeConfirmation";
import { RenderBackupLogs } from "./RenderBackupLogs";
import { RenderBackupStatus } from "./RenderBackupStatus";
import { Restore } from "./Restore/Restore";
import {
  BACKUP_FILTER_OPTS,
  type BackupsControlsState,
} from "./useBackupsControlsState";

export const orderByCreated = {
  key: "created",
  asc: false,
  // created: false,
} as const;

export const CompletedBackups = ({
  setHasBackups,
  backupsFilterType,
  setBackupsFilterType,
  completedBackupsFilter,
}: {
  setHasBackups: (has: boolean) => void;
} & Pick<
  BackupsControlsState,
  "backupsFilterType" | "setBackupsFilterType" | "completedBackupsFilter"
>) => {
  const { connectionId, dbs, dbsTables, dbsMethods, db } = usePrgl();
  const { pgRestore, bkpDelete } = dbsMethods;
  const connection_id = connectionId;

  // const [backupsFilterType, setBackupsFilterType] = useState<
  //   (typeof BACKUP_FILTER_OPTS)[number]["key"]
  // >(BACKUP_FILTER_OPTS[0].key);

  const restoreLogsFConf: FieldConfig<Backups> = {
    name: "restore_logs",
    hideIf: (logs) => !logs,
    render: (logs, row) => (
      <RenderBackupLogs
        logs={logs}
        completed={!(row.restore_status as any)?.loading}
      />
    ),
  };
  const dumpLogsFConf: FieldConfig<Backups> = {
    name: "dump_logs",
    render: (logs, row) => (
      <RenderBackupLogs logs={logs} completed={!(row.status as any)?.loading} />
    ),
  };

  return (
    <SmartCardList
      data-command="BackupsControls.Completed"
      btnColor="gray"
      showTopBar={false}
      title={
        <FlexCol className="mt-1 flex-col gap-p5">
          <label className="font-16 bold">Completed backups</label>
          <div className="flex-row ai-center gap-p5">
            {/* <Btn iconPath={mdiFilter} variant="text" size="small" color="action" />  */}
            <ButtonGroup
              variant="select"
              options={BACKUP_FILTER_OPTS.map((v) => v.key)}
              value={backupsFilterType}
              onChange={(v) => setBackupsFilterType(v)}
            />
          </div>
        </FlexCol>
      }
      onSetData={(items) => setHasBackups(!!items.length)}
      db={dbs as DBHandlerClient}
      methods={dbsMethods}
      tableName="backups"
      tables={dbsTables}
      filter={completedBackupsFilter}
      realtime={true}
      // className="mt-2"
      orderBy={orderByCreated}
      excludeNulls={true}
      fieldConfigs={[
        { name: "id", hide: true },
        {
          name: "initiator",
          label: " ",
          render: (v) => (
            <div title={v}>
              {v === "automatic_backups" ?
                <Icon path={mdiRefreshAuto} />
              : v === "manual_backup" ?
                <Icon path={mdiGestureTapButton} />
              : v}
            </div>
          ),
        },
        {
          name: "name",
          hideIf: (name) => !name,
          label: "Backup name",
          render: (v, row) => (
            <span title={v} className="text-ellipsis">
              {sliceText(v, 30)}
            </span>
          ),
        },
        {
          name: "created",
          label: "Created",
          select: { $ageNow: ["created", null, "second"] },
          render: (value: AnyObject) => <StyledInterval value={value} />,
        },
        {
          name: "dbSizeInBytes",
          label: "DB size",
          render: (val) => bytesToSize(val),
        },
        {
          name: "dump_command",
          label: "Dump command",
          hide: true,
          render: (val) => (
            <span title={val} className="text-ellipsis">
              {sliceText(val, 50)}
            </span>
          ),
        },
        // "connection_id",
        // "credential_id",
        "destination",
        // "created",
        { name: "uploaded", hide: true },
        // "dbSizeInBytes",
        // {
        //   name: "Upload Duration", label: "Upload Duration",
        //   select: { $age: ["uploaded", "created"] },
        //   render: renderInterval
        // },
        {
          name: "sizeInBytes",
          render: (val) => (
            <span title={(+val || 0).toLocaleString() + " Bytes"}>
              {bytesToSize(+val || 0)}
            </span>
          ),
        },
        // "dump_command",
        {
          name: "status",
          label: "Dump status",
          render: (val, row) => <RenderBackupStatus row={row} status={val} />,
        },
        dumpLogsFConf,
        // "restore_command",
        // {
        //   name: "restore_status",
        //   render: renderStatus
        // },
        {
          name: "restored_" as "restore_end",
          label: "Last restored",
          hideIf: (v) => !v,
          select: { $ageNow: ["restore_end", null, "second"] },
          render: (value: AnyObject) => <StyledInterval value={value} />,
        },
        restoreLogsFConf,
      ]}
      getRowFooter={(row: Backups) => (
        <div className="flex-row-wrap gap-1 jc-end ai-center show-on-parent-hoverdd">
          <CodeConfirmation
            title={"Delete the backup file from storage"}
            data-command="BackupsControls.Completed.delete"
            show={!row.uploaded ? "confirmButton" : undefined}
            button={
              <Btn iconPath={mdiDelete} title="Will need to confirm">
                Delete
              </Btn>
            }
            message={
              <InfoRow color="warning">This action is not reversible!</InfoRow>
            }
            confirmButton={(popupClose) => (
              <>
                <Btn
                  iconPath={mdiDelete}
                  variant="outline"
                  color="danger"
                  onClickPromise={() => bkpDelete!(row.id).then(popupClose)}
                >
                  Delete
                </Btn>
                <Btn
                  iconPath={mdiDelete}
                  variant="outline"
                  color="danger"
                  onClickPromise={() =>
                    bkpDelete!(row.id, true).then(popupClose)
                  }
                >
                  Force delete
                </Btn>
              </>
            )}
          />

          <Btn
            iconPath={mdiDownload}
            href={ROUTES.BACKUPS + "/" + row.id}
            color="action"
            title="Right click and 'Save link as...' to download"
            data-command="BackupsControls.Completed.download"
            download
          >
            Download
          </Btn>

          <Restore
            dbs={dbs}
            db={db}
            backupId={row.id}
            connectionId={connection_id}
            dbsMethods={dbsMethods}
            data-command="BackupsControls.Completed.restore"
            button={
              <Btn
                iconPath={mdiBackupRestore}
                title="Will need to confirm"
                variant="filled"
                color="action"
                data-command="BackupControls.Restore"
              >
                Restore...
              </Btn>
            }
            onReadyButton={(restoreOpts, popupClose) => (
              <Btn
                iconPath={mdiBackupRestore}
                variant="filled"
                color="action"
                onClickPromise={() =>
                  pgRestore!(
                    { bkpId: row.id, connId: connectionId },
                    restoreOpts,
                  ).then(popupClose)
                }
              >
                Restore
              </Btn>
            )}
          />
        </div>
      )}
      noDataComponent={
        <InfoRow
          className=""
          variant="filled"
          color="info"
          iconPath=""
          style={{ padding: "2em 2em" }}
        >
          No completed backups
        </InfoRow>
      }
      // noDataComponentMode="hide-all"
    />
  );
};
