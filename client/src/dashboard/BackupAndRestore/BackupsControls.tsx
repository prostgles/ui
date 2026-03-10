import type { DBSSchema } from "@common/publishUtils";
import { DEFAULT_DUMP_OPTS, type PGDumpParams } from "@common/utils";
import Btn from "@components/Btn";
import FormField from "@components/FormField/FormField";
import { InfoRow } from "@components/InfoRow";
import PopupMenu from "@components/PopupMenu";
import {
  mdiDatabasePlusOutline,
  mdiDelete,
  mdiFileUploadOutline,
  mdiStop,
} from "@mdi/js";
import { usePromise } from "prostgles-client";
import type { DBHandlerClient } from "prostgles-client";
import { omitKeys, type AnyObject } from "prostgles-types";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import { dataCommand } from "../../Testing";
import type { DBS, DBSMethods } from "../Dashboard/DBS";
import type { Backups } from "../Dashboard/dashboardUtils";
import type { FieldConfig } from "../SmartCard/SmartCard";
import { SmartCardList } from "../SmartCardList/SmartCardList";
import { StyledInterval } from "../W_SQL/customRenderers";
import { AutomaticBackups } from "./AutomaticBackups";
import { BackupsInProgress } from "./BackupsInProgress";
import { CodeConfirmation } from "./CodeConfirmation";
import { CompletedBackups } from "./CompletedBackups";
import { PGDumpOptions } from "./PGDumpOptions";
import { RenderBackupLogs } from "./RenderBackupLogs";
import { RenderBackupStatus } from "./RenderBackupStatus";
import { Restore } from "./Restore/Restore";
import { useBackupsControlsState } from "./useBackupsControlsState";

export const orderByCreated = {
  key: "created",
  asc: false,
} as const;

export const BackupsControls = ({ prgl }: { prgl: Prgl }) => {
  const {
    connectionId,
    serverState,
    dbs,
    dbsTables,
    dbsMethods,
    dbsMethodSchema,
    db,
    dbsSql,
    sql,
  } = prgl;
  const { getInstalledPsqlVersions, getDBSize, pgDump } = dbsMethods;
  const connection_id = connectionId;

  const {
    backupFilter,
    backupsFilterType,
    completedBackupsFilter,
    hasBackups,
    setBackupsFilterType,
    setHasBackups,
  } = useBackupsControlsState(connection_id);
  const [dumpOpts, setDumpOpts] = useState<PGDumpParams>(DEFAULT_DUMP_OPTS);

  const dbSize = usePromise(
    async () => getDBSize?.({ conId: connection_id }),
    [getDBSize, connection_id],
  );

  const installedPrograms = usePromise(async () => {
    return (await getInstalledPsqlVersions?.()) ?? "none";
  }, [getInstalledPsqlVersions]);

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

  if (!installedPrograms) {
    return null;
  }

  if (installedPrograms === "none") {
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

  return (
    <div className="flex-col gap-2 f-1 min-h-0 w-fit">
      <InfoRow color="info" iconPath={""} variant="naked">
        Current database size: <strong>{dbSize ?? "??"}</strong>
      </InfoRow>
      <div className="flex-row-wrap ai-center gap-p5">
        <PopupMenu
          data-command="config.bkp.create"
          button={
            <Btn
              variant="filled"
              color="action"
              iconPath={mdiDatabasePlusOutline}
            >
              Create backup
            </Btn>
          }
          title="Create backup"
          positioning="center"
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
              className: "ml-auto",
              ...dataCommand("config.bkp.create.start"),
              onClickPromise: async (e) => {
                try {
                  const credId = dumpOpts.credentialID ?? null;
                  if (
                    dumpOpts.destination === "Cloud" &&
                    typeof credId !== "number"
                  ) {
                    throw new Error(
                      "Must select/provide a cloud credential first",
                    );
                  }
                  await pgDump!({
                    conId: connection_id,
                    credId,
                    opts: omitKeys(dumpOpts, ["credentialID", "destination"]),
                  });
                } catch (err) {
                  console.error(err);
                  throw err;
                }
                popupClose?.(e);
              },
            },
          ]}
          render={() => (
            <div className="flex-col gap-1 f-1 min-s-0 bg-inherit">
              <FormField
                label={"Name"}
                type="text"
                hint="Optional, will be used to identify the backup"
                value={dumpOpts.name}
                inputProps={{
                  "data-command": "config.bkp.create.name",
                }}
                onChange={(name) => {
                  setDumpOpts((o) => ({ ...o, name }));
                }}
              />

              <PGDumpOptions
                connectionId={connection_id}
                dbsMethods={dbsMethods}
                dbs={dbs}
                dbSql={dbsSql}
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
            dbs={dbs}
            db={db}
            sql={sql}
            dbsTables={dbsTables}
            connectionId={connection_id}
            dbsMethods={dbsMethods}
          />
        }

        <Restore
          connectionId={connection_id}
          mode="fromFile"
          button={
            <Btn
              color="action"
              iconPath={mdiFileUploadOutline}
              data-command="BackupsControls.restoreFromFile"
            >
              Restore from file...
            </Btn>
          }
        />
      </div>
      <SmartCardList
        db={dbs as DBHandlerClient}
        sql={dbsSql}
        methods={dbsMethodSchema}
        tableName="backups"
        btnColor="gray"
        style={{ minHeight: "250px" }}
        data-command="BackupControls.backupsInProgress"
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
        orderBy={orderByCreated}
        excludeNulls={true}
        fieldConfigs={
          [
            { name: "id", hide: true },
            {
              name: "restore_status",
              render: (val, row) => (
                <RenderBackupStatus row={row} status={val} />
              ),
            },
            {
              name: "restore_start",
              label: "Started",
              select: { $ageNow: ["restore_start", null, "second"] },
              render: (value) => <StyledInterval value={value} />,
            },
            restoreLogsFConf,
          ] satisfies FieldConfig<Backups>[]
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

      <BackupsInProgress {...prgl} backupFilter={backupFilter} />

      <CompletedBackups
        setHasBackups={setHasBackups}
        backupsFilterType={backupsFilterType}
        completedBackupsFilter={completedBackupsFilter}
        setBackupsFilterType={setBackupsFilterType}
      />

      {hasBackups && (
        <DeleteAllBackups
          dbs={dbs}
          dbsMethods={dbsMethods}
          filter={completedBackupsFilter}
          filterName={backupsFilterType}
          data-command="BackupsControls.Completed.deleteAll"
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
  const onDeleteAll = async () => {
    let bkp: DBSSchema["backups"] | undefined;
    do {
      bkp = await dbs.backups.findOne(filter);
      if (bkp) {
        await dbsMethods.bkpDelete!({ bkpId: bkp.id, force: true });
      }
    } while (bkp);
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
      confirmButtons={[
        {
          iconPath: mdiDelete,
          variant: "outline",
          color: "danger",
          "data-command": "BackupControls.DeleteAll.Confirm",
          onClickPromise: onDeleteAll,
          children: "Force delete backups",
        },
      ]}
    />
  );
};

export const bytesToSize = (bytes, _precision = 2) => {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes == 0) return "0 Byte";
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)) + "");
  const unit = sizes[i];
  const value = bytes / Math.pow(1024, i);
  const precision = i > 0 ? _precision : 0;
  const valueStr = value.toFixed(precision);
  return `${valueStr} ${unit}`;
};
