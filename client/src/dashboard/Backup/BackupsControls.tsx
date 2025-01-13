import {
  mdiBackupRestore,
  mdiDatabasePlusOutline,
  mdiDelete,
  mdiDownload,
  mdiFileUploadOutline,
  mdiGestureTapButton,
  mdiRefreshAuto,
  mdiStop,
} from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useState } from "react";
import type { PGDumpParams } from "../../../../commonTypes/utils";
import { sliceText } from "../../../../commonTypes/utils";
import type { Prgl } from "../../App";
import { dataCommand } from "../../Testing";
import Btn from "../../components/Btn";
import ButtonGroup from "../../components/ButtonGroup";
import Chip from "../../components/Chip";
import ErrorComponent from "../../components/ErrorComponent";
import { Icon } from "../../components/Icon/Icon";
import { InfoRow } from "../../components/InfoRow";
import PopupMenu from "../../components/PopupMenu";
import { ProgressBar } from "../../components/ProgressBar";
import { CodeEditor } from "../CodeEditor/CodeEditor";
import type { DBS, DBSMethods } from "../Dashboard/DBS";
import type { Backups } from "../Dashboard/dashboardUtils";
import { StyledInterval } from "../W_SQL/customRenderers";
import type { FieldConfig, FieldConfigRender } from "../SmartCard/SmartCard";
import SmartCardList from "../SmartCard/SmartCardList";
import { AutomaticBackups } from "./AutomaticBackups";
import { CodeConfirmation } from "./CodeConfirmation";
import { DEFAULT_DUMP_OPTS, DumpOptions } from "./DumpOptions";
import { RestoreOptions } from "./RestoreOptions";
import { usePromise } from "prostgles-client/dist/react-hooks";

const BACKUP_FILTER_OPTS = [
  { key: "This connection" },
  { key: "Deleted connections" },
  { key: "All connections" },
] as const;

export const BackupsControls = ({
  prgl: { connectionId, serverState, dbs, dbsTables, dbsMethods, theme, db },
}: {
  prgl: Prgl;
}) => {
  const connection_id = connectionId;

  const [backupsFilterType, setBackupsFilterType] = useState<
    (typeof BACKUP_FILTER_OPTS)[number]["key"]
  >(BACKUP_FILTER_OPTS[0].key);

  const [dumpOpts, setDumpOpts] = useState<PGDumpParams>(DEFAULT_DUMP_OPTS);
  const [hasBackups, sethasBackups] = useState(false);

  const dbSize = usePromise(async () => dbsMethods.getDBSize?.(connection_id));

  const renderStatus: FieldConfigRender<Backups> = (
    status: Backups["status"] | undefined,
    row,
  ) => {
    const commonChipStyle: React.CSSProperties = {
      padding: 0,
      background: "unset",
      border: "unset",
    };
    const total = +(
      (status as any)?.loading?.total ||
      row.sizeInBytes ||
      +row.dbSizeInBytes ||
      0
    );
    return (
      !status ? null
      : "ok" in status ?
        <Chip
          style={commonChipStyle}
          className="font-12"
          color="green"
          value={"Completed"}
        />
      : "err" in status ?
        <Chip
          style={commonChipStyle}
          color="red"
          value={ErrorComponent.parsedError(status.err)}
        />
      : status.loading ?
        <div className="text-1p5">
          <ProgressBar
            message={
              !status.loading.loaded ?
                "Preparing..."
              : `Processed ${bytesToSize(status.loading.loaded || 0)}/${total ? bytesToSize(total) : "unknown"}`
            }
            value={status.loading.loaded || 0}
            totalValue={status.loading.total || 0}
          />
        </div>
      : null
    );
  };

  const renderInterval: FieldConfigRender = (value, row) => (
    <StyledInterval value={value} />
  );

  const renderLogs = ({
    logs,
    completed,
    type,
  }: {
    logs: string;
    completed: boolean;
    type: "restore" | "dump";
  }) => (
    <PopupMenu
      showFullscreenToggle={{}}
      title="Logs"
      button={
        !logs ?
          <div></div>
        : <Btn className="w-full" variant="outline" size="small">
            {completed ?
              "..."
            : sliceText(
                (logs || "").split("\n").at(-1)!.slice(15).split(":")[1] ?? "",
                40,
                "...",
              )
            }
          </Btn>
      }
      onClickClose={false}
      positioning="top-center"
    >
      <CodeEditor
        style={{ minWidth: "80vw", minHeight: "80vh" }}
        value={logs}
        options={{
          minimap: { enabled: false },
          lineNumbers: "off",
        }}
        language="bash"
      />
    </PopupMenu>
  );

  const restoreLogsFConf: FieldConfig<Backups> = {
    name: "restore_logs",
    renderValue: (logs, row) =>
      renderLogs({
        logs,
        completed: !(row.restore_status as any)?.loading,
        type: "restore",
      }),
  };
  const dumpLogsFConf: FieldConfig<Backups> = {
    name: "dump_logs",
    renderValue: (logs, row) =>
      renderLogs({
        logs,
        completed: !(row.status as any)?.loading,
        type: "dump",
      }),
  };

  if (!serverState.canDumpAndRestore) {
    return (
      <div className="flex-col p-1 gap-1 f-1 min-h-0 w-fit">
        <InfoRow>
          This feature is not available. The following commands are not
          available to the server pg_dump, pg_restore and psql{" "}
        </InfoRow>
      </div>
    );
  }

  const restoreStoppedError = "Stopped by user";

  const backupFilter =
    backupsFilterType === "This connection" ? { connection_id }
    : backupsFilterType === "Deleted connections" ? { connection_id: null }
    : {};
  const completedBackupsFilter = {
    $and: [backupFilter, { "status->ok": { "<>": null } }],
  };

  return (
    <div className="flex-col gap-2 f-1 min-h-0 w-fit">
      <InfoRow color="info" iconPath={""} variant="naked">
        Current database size: <strong>{dbSize ?? "??"}</strong>
      </InfoRow>
      <div className="flex-row-wrap ai-center gap-p5">
        <PopupMenu
          button={
            <Btn
              variant="filled"
              color="action"
              iconPath={mdiDatabasePlusOutline}
              {...dataCommand("config.bkp.create")}
            >
              Create backup
            </Btn>
          }
          title="Create backup"
          clickCatchStyle={{ opacity: 1 }}
          footerButtons={(popupClose) => [
            {
              label: "Cancel",
              onClickClose: true,
            },
            {
              label: "Start backup",
              variant: "filled",
              color: "action",
              ...dataCommand("config.bkp.create.start"),
              onClickPromise: async (e) => {
                try {
                  await dbsMethods.pgDump!(
                    connection_id,
                    dumpOpts.destination === "Cloud" ?
                      dumpOpts.credentialID
                    : null,
                    dumpOpts,
                  );
                } catch (err) {
                  console.error(err);
                  throw err;
                }
                popupClose?.(e);
              },
            },
          ]}
          render={(popupClose) => (
            <div className="flex-col gap-1 f-1 min-s-0 bg-inherit">
              <DumpOptions
                theme={theme}
                connectionId={connection_id}
                dbsMethods={dbsMethods}
                dbs={dbs}
                dbProject={db}
                dbsTables={dbsTables}
                opts={dumpOpts}
                onChange={setDumpOpts}
                hideDestination={false}
              />
            </div>
          )}
        />

        {serverState.isElectron ?
          <></>
        : <AutomaticBackups
            theme={theme}
            dbs={dbs}
            db={db}
            dbsTables={dbsTables}
            connectionId={connection_id}
            dbsMethods={dbsMethods}
          />
        }

        <RestoreOptions
          db={db}
          dbs={dbs}
          connectionId={connection_id}
          dbsMethods={dbsMethods}
          fromFile={true}
          button={
            <Btn color="action" iconPath={mdiFileUploadOutline}>
              Restore from file...
            </Btn>
          }
        />
      </div>
      <SmartCardList
        theme={theme}
        db={dbs as any}
        methods={dbsMethods}
        tableName="backups"
        btnColor="gray"
        style={{ minHeight: "250px" }}
        title="Restore in progress:"
        tables={dbsTables}
        filter={{
          $and: [
            backupFilter,
            { "restore_status.<>": null },
            { "restore_status->loading.<>": null },
            {
              $or: [
                { "restore_status->err": null },
                { "restore_status->>err.<>": restoreStoppedError },
              ],
            },
          ],
        }}
        realtime={true}
        className="mt-2"
        orderBy={{
          created: false,
        }}
        excludeNulls={true}
        fieldConfigs={
          [
            { name: "id", hide: true },
            {
              name: "restore_status",
              renderValue: renderStatus,
            },
            {
              name: "restore_start",
              label: "Started",
              select: { $ageNow: ["restore_start", null, "second"] },
              renderValue: renderInterval,
            },
            restoreLogsFConf,
          ] as FieldConfig[]
        }
        getRowFooter={(row) => (
          <div className="flex-row-wrap gap-1 jc-end ai-center">
            <Btn
              iconPath={mdiStop}
              variant="outline"
              onClickPromise={async () => {
                await dbs.backups.update(
                  { id: row.id },
                  { restore_status: { err: restoreStoppedError } },
                );
              }}
            >
              Stop
            </Btn>
          </div>
        )}
        noDataComponent={<></>}
        noDataComponentMode="hide-all"
      />

      <SmartCardList
        db={dbs as any}
        theme={theme}
        methods={dbsMethods}
        tableName="backups"
        btnColor="gray"
        style={{ minHeight: "250px" }}
        title="Backup in progress:"
        tables={dbsTables}
        filter={{ $and: [backupFilter, { "status->ok": null }] }}
        realtime={true}
        className="mt-2"
        orderBy={{
          created: false,
        }}
        excludeNulls={true}
        fieldConfigs={
          [
            { name: "id", hide: true },
            {
              name: "status",
              label: "Dump status",
              renderValue: renderStatus,
            },
            {
              name: "created_ago",
              label: "Started",
              select: { $ageNow: ["created", null, "second"] },
              renderValue: renderInterval,
            },
            dumpLogsFConf,
          ] as FieldConfig[]
        }
        getRowFooter={(row) => (
          <div className="flex-row-wrap gap-1 jc-end ai-center">
            <Btn
              iconPath={mdiStop}
              variant="outline"
              color="danger"
              onClickPromise={async () => {
                await dbsMethods.bkpDelete!(row.id, true);
              }}
            >
              Stop & delete
            </Btn>
          </div>
        )}
        noDataComponent={<></>}
        noDataComponentMode="hide-all"
      />

      <SmartCardList
        theme={theme}
        btnColor="gray"
        title={
          <div className="mt-1 flex-col gap-1">
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
          </div>
        }
        onSetData={(items) => sethasBackups(!!items.length)}
        db={dbs as any}
        methods={dbsMethods}
        tableName="backups"
        tables={dbsTables}
        filter={completedBackupsFilter}
        realtime={true}
        // className="mt-2"
        orderBy={{
          created: false,
        }}
        excludeNulls={true}
        fieldConfigs={[
          { name: "id", hide: true },
          {
            name: "initiator",
            label: " ",
            renderValue: (v) => (
              <div title={v}>
                {v === "automatic_backups" ?
                  <Icon path={mdiRefreshAuto} size={1} />
                : v === "manual_backup" ?
                  <Icon path={mdiGestureTapButton} />
                : v}
              </div>
            ),
          },
          {
            name: "uploaded_",
            label: "Created",
            select: { $ageNow: ["created", null, "second"] },
            renderValue: renderInterval,
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
          //   renderValue: renderInterval
          // },
          {
            name: "sizeInBytes",
            renderValue: (val) => (
              <span title={(+val || 0).toLocaleString() + " Bytes"}>
                {bytesToSize(+val || 0)}
              </span>
            ),
          },
          // "dump_command",
          {
            name: "status",
            label: "Dump status",
            renderValue: renderStatus,
          },
          dumpLogsFConf,
          // "restore_command",
          // {
          //   name: "restore_status",
          //   renderValue: renderStatus
          // },
          {
            name: "restored_",
            label: "Last restored",
            select: { $ageNow: ["restore_end", null, "second"] },
            renderValue: renderInterval,
          },
          restoreLogsFConf,
        ]}
        getRowFooter={(row: Backups) => (
          <div className="flex-row-wrap gap-1 jc-end ai-center show-on-parent-hoverdd">
            <CodeConfirmation
              title={"Delete the backup file from storage"}
              show={!row.uploaded ? "confirmButton" : undefined}
              button={
                <Btn iconPath={mdiDelete} title="Will need to confirm">
                  Delete
                </Btn>
              }
              message={
                <InfoRow color="warning">
                  This action is not reversible!
                </InfoRow>
              }
              confirmButton={(popupClose) => (
                <>
                  <Btn
                    iconPath={mdiDelete}
                    variant="outline"
                    color="danger"
                    onClickPromise={() =>
                      dbsMethods.bkpDelete!(row.id).then(popupClose)
                    }
                  >
                    Delete
                  </Btn>
                  <Btn
                    iconPath={mdiDelete}
                    variant="outline"
                    color="danger"
                    onClickPromise={() =>
                      dbsMethods.bkpDelete!(row.id, true).then(popupClose)
                    }
                  >
                    Force delete
                  </Btn>
                </>
              )}
            />

            <Btn
              iconPath={mdiDownload}
              href={"/prostgles_backups/" + row.id}
              color="action"
              title="Right click and 'Save link as...' to download"
              download
            >
              Download
            </Btn>

            <RestoreOptions
              dbs={dbs}
              db={db}
              backupId={row.id}
              connectionId={connection_id}
              dbsMethods={dbsMethods}
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
                    dbsMethods.pgRestore!(
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

      {hasBackups && (
        <DeleteAllBackups
          dbs={dbs}
          dbsMethods={dbsMethods}
          filter={completedBackupsFilter}
          filterName={backupsFilterType}
        />
      )}
    </div>
  );
};

type DeleteAllBackupsProps = {
  dbs: DBS;
  dbsMethods: DBSMethods;
  filter: AnyObject;
  filterName: string;
};

const DeleteAllBackups = ({
  dbs,
  filter,
  dbsMethods,
  filterName,
}: DeleteAllBackupsProps) => {
  const onDeleteAll = async (popupClose: VoidFunction) => {
    let bkp;
    do {
      bkp = await dbs.backups.findOne(filter);
      if (bkp) {
        await dbsMethods.bkpDelete!(bkp.id, true);
      }
    } while (bkp);

    popupClose();
  };

  return (
    <CodeConfirmation
      className="ml-p25"
      positioning="center"
      data-command="BackupControls.DeleteAll"
      button={
        <Btn iconPath={mdiDelete} color="danger" title="Will need to confirm">
          Delete all...
        </Btn>
      }
      message={
        <InfoRow style={{ alignItems: "center" }} color="danger">
          Will delete ALL backup files from storage for{" "}
          <strong>{filterName}</strong>. This action is not reversible!
        </InfoRow>
      }
      confirmButton={(popupClose) => (
        <>
          <Btn
            iconPath={mdiDelete}
            variant="outline"
            color="danger"
            data-command="BackupControls.DeleteAll.Confirm"
            onClickPromise={() => onDeleteAll(popupClose)}
          >
            Force delete backups
          </Btn>
        </>
      )}
    />
  );
};

export function bytesToSize(bytes, _precision = 2) {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)) + "");
  const unit = sizes[i];
  const value = bytes / Math.pow(1024, i);
  const precision = i > 0 ? _precision : 0;
  const valueStr = value.toFixed(precision);
  return `${valueStr} ${unit}`;
}

// const renderInterval: FieldConfigRender<Backups> = (v: any, row) => {
//   const res = (isEmpty(v))? ["", ""] :
//     "years" in v? [`${v.years}y`, "-red-500"] :
//     "months" in v? [`${v.months}mo`, "-red-500"] :
//     "weeks" in v? [`${v.weeks}w`, "-yellow-500"] :
//     "days" in v? [`${v.days}d`, "-yellow-500"] :
//     "hours" in v? [`${v.hours}h`, "-green-500"] :
//     "minutes" in v? [`${v.minutes}min`, "-green-500"] :
//     "seconds" in v? [`${v.seconds}s`, "-green-500"] :
//     "milliseconds" in v? [`${v.milliseconds}ms`, "-green-500"] :
//     [getKeys(v).map(k => `${v[k]} ${k}`).join(","), "-gray-500"] as const;

//   return <span title={JSON.stringify(v).slice(1, -1)} className={`text${res[1]}`}>{res[0] || "0s"} ago</span>
// }

// {
//   name: "Restore Duration", label: "Restore Duration",
//   select: { $age: ["restore_end", "restore_start"] },
//   renderValue: val => !val? "" : getKeys(val).map(k => `${val[k]} ${k}`).join(", ")

// },
// { name: "last_updated", hide: true},
// {
//   name: "last_updated_ago",
//   label: "Last updated",
//   select: { $ageNow: ["last_updated", null, "second"] },
//   renderValue: (val, row) => <span title={row.last_updated.toString()}>{renderInterval(val, row)}</span>
// }
