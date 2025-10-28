import { mdiBackupRestore } from "@mdi/js";
import { useEffectDeep, usePromise } from "prostgles-client/dist/react-hooks";
import React, { useEffect, useState } from "react";
import type { DBSSchema } from "@common/publishUtils";
import { sliceText } from "@common/utils";
import type { Prgl } from "../../../App";
import Btn from "@components/Btn";
import FormField from "@components/FormField/FormField";
import { InfoRow } from "@components/InfoRow";
import { Section } from "@components/Section";
import Select from "@components/Select/Select";
import type { DBS } from "../../Dashboard/DBS";
import { CodeConfirmation } from "../CodeConfirmation";
import { FORMATS } from "../DumpOptions";
import { DumpRestoreAlerts } from "../DumpRestoreAlerts";
import { FlexCol } from "@components/Flex";
import { t } from "../../../i18n/i18nUtils";
import { RestoreOptions } from "./RestoreOptions";

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

export type RestoreProps = Pick<Prgl, "dbsMethods" | "db"> & {
  button: React.ReactNode;
  defaultOpts?: RestoreOpts;
  dbs: DBS;
  backupId?: string;
  connectionId: string;
} & (
    | {
        fromFile?: true;
        onReadyButton?: undefined;
      }
    | {
        fromFile?: undefined;
        onReadyButton: (
          opts: RestoreOpts,
          popupClose: () => void,
        ) => React.ReactNode;
      }
  );
export const Restore = (props: RestoreProps) => {
  const {
    defaultOpts,
    button,
    dbs,
    db,
    backupId,
    connectionId,
    dbsMethods,
    fromFile,
    onReadyButton,
  } = props;

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

  const restoreFile = async (popupClose: () => void) => {
    if (!dbsMethods.streamBackupFile) return;
    const { streamBackupFile } = dbsMethods;

    const f = file;
    if (!f) return;

    const stream = f.stream();
    const streamId = await streamBackupFile(
      "start",
      f.name,
      connectionId,
      null,
      f.size,
      restoreOpts,
    );

    const writableStream = new WritableStream({
      start(controller) {},
      async write(chunk, controller) {
        try {
          await streamBackupFile("chunk", streamId, null, chunk, undefined);
        } catch (err) {
          console.error(err);
          controller.error(err);
          writableStream.abort(err);
        }
      },
      async close() {
        (async () => {
          await streamBackupFile("end", streamId, null, undefined, undefined);
        })();
      },
      abort(reason) {
        console.error("[abort]", reason);
      },
    });
    stream.pipeTo(writableStream);
    popupClose();
  };

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
      confirmButton={(popupClose) =>
        onReadyButton ?
          onReadyButton(restoreOpts, popupClose)
        : <Btn
            iconPath={mdiBackupRestore}
            color="action"
            variant="filled"
            onClick={() => restoreFile(popupClose)}
          >
            Restore
          </Btn>
      }
      hideConfirm={!!(fromFile && !file)}
      topContent={(popupClose) => (
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
          <DumpRestoreAlerts {...{ dbsMethods, connectionId, dbProject: db }} />
          {plainFormatAlert}
          {fromFile && (
            <FormField
              type="file"
              label="File"
              onChange={(files) => {
                const f: FileOrMaybeItsNothing = files[0];
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
