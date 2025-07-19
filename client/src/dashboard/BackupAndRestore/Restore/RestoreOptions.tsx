import React from "react";
import FormField from "../../../components/FormField/FormField";
import { InfoRow } from "../../../components/InfoRow";
import Select from "../../../components/Select/Select";
import { FORMATS } from "../DumpOptions";
import type { RestoreOpts } from "./Restore";

type P = {
  fromFile: boolean | undefined;
  restoreOpts: RestoreOpts;
  setRestoreOpts: (opts: RestoreOpts) => void;
};

export const RestoreOptions = (props: P) => {
  const { restoreOpts, setRestoreOpts, fromFile } = props;

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

  const formats = FORMATS.slice(0).map((_f) => {
    const f = { ..._f };
    if (!fromFile && f.key !== format) {
      (f as any).disabledInfo = "Can only use the same format as the dump file";
    }
    return f;
  });

  return (
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
            type="checkbox"
            onChange={(clean) => {
              setRestoreOpts({ ...restoreOpts, clean });
            }}
          />
          <FormField
            value={create}
            label="Create"
            hint="Create the database before restoring into it. If --clean is also specified, drop and recreate the target database before connecting to it. Set to false if restoring into a different database."
            type="checkbox"
            onChange={(create) => {
              setRestoreOpts({ ...restoreOpts, create });
            }}
          />
          <FormField
            value={dataOnly}
            label="Data only"
            hint="Restore only the data, not the schema (data definitions). Table data, large objects, and sequence values are restored, if present in the archive."
            type="checkbox"
            onChange={(dataOnly) => {
              setRestoreOpts({ ...restoreOpts, dataOnly });
            }}
          />
          <FormField
            value={noOwner}
            label="No owner"
            hint="Do not output commands to set ownership of objects to match the original database"
            type="checkbox"
            onChange={(noOwner) => {
              setRestoreOpts({ ...restoreOpts, noOwner });
            }}
          />
          <FormField
            value={ifExists}
            label="If exists"
            hint="Use conditional commands (i.e., add an IF EXISTS clause) to drop database objects. This option is not valid unless --clean is also specified."
            type="checkbox"
            onChange={(ifExists) => {
              setRestoreOpts({ ...restoreOpts, ifExists });
            }}
          />
        </>
      )}
      <FormField
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
            rel="noreferrer"
          >
            this official site
          </a>
        </InfoRow>
      )}
    </>
  );
};
