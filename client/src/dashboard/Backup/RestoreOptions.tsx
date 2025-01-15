import { mdiBackupRestore } from "@mdi/js";
import { useEffectDeep, usePromise } from "prostgles-client/dist/react-hooks";
import React, { useEffect, useState } from "react";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import { sliceText } from "../../../../commonTypes/utils";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import FormField from "../../components/FormField/FormField";
import { InfoRow } from "../../components/InfoRow";
import { Section } from "../../components/Section";
import Select from "../../components/Select/Select";
import type { DBS } from "../Dashboard/DBS";
import { CodeConfirmation } from "./CodeConfirmation";
import { FORMATS } from "./DumpOptions";
import { DumpRestoreAlerts } from "./DumpRestoreAlerts";
import { FlexCol } from "../../components/Flex";
import { t } from "../../i18n/i18nUtils";

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

type RestoreOptionsProps = Pick<Prgl, "dbsMethods" | "db"> & {
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
export const RestoreOptions = (props: RestoreOptionsProps) => {
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
  const {
    numberOfJobs,
    format,
    clean,
    create,
    dataOnly,
    noOwner,
    ifExists,
    keepLogs,
    excludeSchema,
  } = restoreOpts;

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

  const formats = FORMATS.slice(0).map((_f) => {
    const f = { ..._f };
    if (!fromFile && f.key !== format) {
      (f as any).disabledInfo = "Can only use the same format as the dump file";
    }
    return f;
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

  let mainContent = (
    <FlexCol style={{ maxHeight: "600px", overflow: "auto" }}>
      {!!fromFile && (
        <FormField
          type="file"
          asColumn={true}
          label="File"
          onChange={(files) => {
            const f: FileOrMaybeItsNothing = files[0];
            setFile(f);
          }}
        />
      )}
      {(!fromFile || !!file) && (
        <>
          <Select
            label="File format"
            value={format}
            fullOptions={formats}
            onChange={(format) => {
              setRestoreOpts({ ...restoreOpts, format });
            }}
          />
          {format !== "p" && (
            <>
              <Select
                label="Number of jobs"
                value={numberOfJobs}
                options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
                onChange={(numberOfJobs) => {
                  setRestoreOpts({ ...restoreOpts, numberOfJobs });
                }}
              />
              <FormField
                value={excludeSchema}
                label="Exclude schema"
                hint="Do not restore objects that are in the named schema"
                type="text"
                onChange={(excludeSchema) => {
                  setRestoreOpts({ ...restoreOpts, excludeSchema });
                }}
              />
              <FormField
                value={clean}
                label="Clean"
                hint="Drop and Create commands for database objects. Will not delete objects that don't exist in the dump file"
                asColumn={true}
                type="checkbox"
                onChange={(clean) => {
                  setRestoreOpts({ ...restoreOpts, clean });
                }}
              />
              <FormField
                value={create}
                label="Create"
                hint="Create the database before restoring into it. If --clean is also specified, drop and recreate the target database before connecting to it. Set to false if restoring into a different database."
                asColumn={true}
                type="checkbox"
                onChange={(create) => {
                  setRestoreOpts({ ...restoreOpts, create });
                }}
              />
              <FormField
                value={dataOnly}
                label="Data only"
                hint="Restore only the data, not the schema (data definitions). Table data, large objects, and sequence values are restored, if present in the archive."
                asColumn={true}
                type="checkbox"
                onChange={(dataOnly) => {
                  setRestoreOpts({ ...restoreOpts, dataOnly });
                }}
              />
              <FormField
                value={noOwner}
                label="No owner"
                hint="Do not output commands to set ownership of objects to match the original database"
                asColumn={true}
                type="checkbox"
                onChange={(noOwner) => {
                  setRestoreOpts({ ...restoreOpts, noOwner });
                }}
              />
              <FormField
                value={ifExists}
                label="If exists"
                hint="Use conditional commands (i.e., add an IF EXISTS clause) to drop database objects. This option is not valid unless --clean is also specified."
                asColumn={true}
                type="checkbox"
                onChange={(ifExists) => {
                  setRestoreOpts({ ...restoreOpts, ifExists });
                }}
              />
            </>
          )}
          <FormField
            asColumn={true}
            value={keepLogs}
            type="checkbox"
            label="Keep logs"
            onChange={(keepLogs) => {
              setRestoreOpts({ ...restoreOpts, keepLogs });
            }}
            hint="Save restore logs to the backup record. Useful for debugging"
          />
          {format !== "p" && (
            <InfoRow color="info" className="noselect">
              For more info on options visit{" "}
              <a
                target="_blank"
                href="https://www.postgresql.org/docs/current/app-pgrestore.html"
              >
                this official site
              </a>
            </InfoRow>
          )}
        </>
      )}
    </FlexCol>
  );

  const plainFormatAlert = format === "p" && (
    <InfoRow color="warning">
      Data from this entire server (including user data) may be affected because
      this is a restore from a plain SQL file.
    </InfoRow>
  );
  let title: React.ReactNode;
  if (!fromFile) {
    title = (
      <InfoRow
        variant="naked"
        iconPath={mdiBackupRestore}
        color="action"
        className="text-medium font-20 "
        style={{ fontWeight: 400 }}
      >
        Restore{" "}
        {backup?.options.command === "pg_dumpall" ? "server " : "database "}
        using backup from{" "}
        <strong>
          {backup ? new Date(backup.created).toLocaleString() : "???"}
        </strong>
      </InfoRow>
    );
    mainContent = (
      <>
        {title}
        <DumpRestoreAlerts {...{ dbsMethods, connectionId, dbProject: db }} />
        {plainFormatAlert}
        <Section
          title={t.common.Options}
          className="w-full"
          contentClassName="p-1"
          buttonStyle={{ background: "var(--bg-color-0)" }}
        >
          {mainContent}
        </Section>
      </>
    );
  } else {
    title = (
      <InfoRow
        variant="naked"
        iconPath={mdiBackupRestore}
        color="action"
        className="text-medium font-20 "
        style={{ fontWeight: 400 }}
      >
        Restore database from{" "}
        <strong>
          {!file ? "local file" : sliceText(file.name, 44, undefined, true)}{" "}
        </strong>
      </InfoRow>
    );
    mainContent = (
      <>
        {title}
        <DumpRestoreAlerts {...{ dbsMethods, connectionId, dbProject: db }} />
        {plainFormatAlert}
        {mainContent}
      </>
    );
  }

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
      topContent={(popupClose) => mainContent}
    />
  );
};
