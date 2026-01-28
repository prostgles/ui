import type { DBSSchema } from "@common/publishUtils";
import { sliceText } from "@common/utils";
import FormField from "@components/FormField/FormField";
import { InfoRow } from "@components/InfoRow";
import { Section } from "@components/Section";
import { mdiBackupRestore } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useEffectDeep, usePromise } from "prostgles-client";
import React, { useMemo, useState } from "react";
import { t } from "../../../i18n/i18nUtils";
import {
  CodeConfirmation,
  type CodeConfirmationProps,
} from "../CodeConfirmation";
import { DumpRestoreAlerts } from "../DumpRestoreAlerts";
import { RestoreOptions } from "./RestoreOptions";
import { useRestoreDatabaseFromFile } from "./useRestoreDatabaseFromFile";

export type RestoreOpts = DBSSchema["backups"]["restore_options"];

const DEFAULT_RESTORE_OPTS: RestoreOpts = {
  clean: true,
  create: false,
  dataOnly: false,
  noOwner: false,
  command: "pg_restore",
  excludeSchema: "prostgles",
  ifExists: true,
  format: "c",
  keepLogs: false,
};

export type RestoreProps = {
  button: React.ReactNode;
  defaultOpts?: RestoreOpts;
  connectionId: string;
} & (
  | {
      mode: "fromFile";
      backupId?: undefined;
    }
  | {
      mode: "fromBackup";
      backupId: string;
    }
);
export const Restore = (props: RestoreProps) => {
  const {
    dbs,
    dbsMethods: { pgRestore },
  } = usePrgl();
  const { defaultOpts, button, backupId, connectionId, mode } = props;
  const fromFile = mode === "fromFile";
  type FileOrMaybeItsNothing = File | null | undefined;
  const [file, setFile] = useState<FileOrMaybeItsNothing | void>();
  const [restoreOpts, setRestoreOpts] = useState(
    defaultOpts ?? DEFAULT_RESTORE_OPTS,
  );
  const { format } = restoreOpts;

  useEffectDeep(() => {
    if (file) {
      setRestoreOpts({
        ...restoreOpts,
        format: file.name.toLowerCase().endsWith(".sql") ? "p" : "c",
      });
    }
  }, [file, restoreOpts]);

  const { restoreFile } = useRestoreDatabaseFromFile({
    connectionId,
    restoreOpts,
  });

  const backup = usePromise(async () => {
    const bkp = await dbs.backups.findOne({ id: backupId });
    if (bkp) {
      const bkpFormat =
        bkp.options.command === "pg_dumpall" ? "p" : bkp.options.format;
      if (format !== bkpFormat) {
        setRestoreOpts({ ...restoreOpts, format: bkpFormat });
      }
    }

    return bkp;
  }, [backupId, dbs.backups, format, restoreOpts]);

  const plainFormatAlert = format === "p" && (
    <InfoRow color="warning">
      Data from this entire server (including user data) may be affected because
      this is a restore from a plain SQL file.
    </InfoRow>
  );

  const confirmButtons = useMemo(() => {
    if (fromFile) {
      return [
        {
          iconPath: mdiBackupRestore,
          color: "action",
          variant: "filled",
          onClickPromise: () => {
            if (!file) {
              throw new Error("No file selected for restore");
            }
            return restoreFile(file);
          },
          children: "Restore",
        },
      ] satisfies CodeConfirmationProps["confirmButtons"];
    }

    return [
      {
        iconPath: mdiBackupRestore,
        variant: "filled",
        color: "action",
        onClickPromise: async () => {
          if (!pgRestore) {
            throw new Error("pgRestore method not available");
          }
          await pgRestore({
            bkpId: backupId,
            connId: connectionId,
            opts: restoreOpts,
          });
        },
        children: "Restore",
      },
    ] satisfies CodeConfirmationProps["confirmButtons"];
  }, [
    backupId,
    connectionId,
    file,
    fromFile,
    pgRestore,
    restoreFile,
    restoreOpts,
  ]);

  return (
    <CodeConfirmation
      contentStyle={{
        maxWidth: "700px",
      }}
      positioning="center"
      message={
        <InfoRow color="warning">
          If you continue the current database and/or server information might
          be lost. This process is not reversible
        </InfoRow>
      }
      button={button}
      confirmButtons={confirmButtons}
      hideConfirm={!!(fromFile && !file)}
      topContent={() => (
        <>
          <InfoRow
            variant="naked"
            iconPath={mdiBackupRestore}
            color="action"
            className="text-medium font-20 "
            style={{ fontWeight: 400 }}
          >
            {!fromFile ?
              <>
                Restore{" "}
                {backup?.options.command === "pg_dumpall" ?
                  "server "
                : "database "}
                using backup from{" "}
                <strong>
                  {backup ? new Date(backup.created).toLocaleString() : "???"}
                </strong>
              </>
            : <>
                Restore database from{" "}
                <strong>
                  {!file ?
                    "local file"
                  : sliceText(file.name, 44, undefined, true)}{" "}
                </strong>
              </>
            }
          </InfoRow>
          <DumpRestoreAlerts connectionId={connectionId} />
          {plainFormatAlert}
          {fromFile && (
            <FormField
              type="file"
              label="File"
              onChange={(files: FileList) => {
                const f: FileOrMaybeItsNothing = files[0]; // ??? is this a FormField bug?
                setFile(f);
              }}
            />
          )}
          {Boolean(!fromFile || file) && (
            <Section
              title={t.common.Options}
              className="w-full"
              contentClassName="p-1"
              buttonStyle={{ background: "var(--bg-color-0)" }}
            >
              <RestoreOptions
                fromFile={fromFile}
                restoreOpts={restoreOpts}
                setRestoreOpts={setRestoreOpts}
              />
            </Section>
          )}
        </>
      )}
    />
  );
};
