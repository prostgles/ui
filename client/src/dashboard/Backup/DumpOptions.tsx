
import React, { useState } from "react";
import type { PGDumpParams } from "../../../../commonTypes/utils";
import ErrorComponent from "../../components/ErrorComponent";
import { FlexRowWrap } from "../../components/Flex";
import FormField from "../../components/FormField/FormField";
import { InfoRow } from "../../components/InfoRow";
import { Section } from "../../components/Section";
import Select from "../../components/Select/Select";
import type { FullExtraProps } from "../../pages/ProjectConnection/ProjectConnection";
import { DumpLocationOptions } from "./DumpLocationOptions";
import { DumpRestoreAlerts } from "./DumpRestoreAlerts";

export const FORMATS = [
  { key: "p", label: "Plain",   subLabel: "Output a plain-text SQL script file" },
  { key: "c", label: "Custom",  subLabel: "(Preferred) Output a custom-format archive suitable for input into pg_restore. This format is also compressed by default" },
  { key: "t", label: "Tar",     subLabel: "Output a tar-format archive suitable for input into pg_restore" }
] as const;

const DUMP_COMMANDS = [
  { key: "pg_dump", label: "This database" , subLabel: "Backup this database only - pg_dump" },
  { key: "pg_dumpall", label: "This server", subLabel: "Backup this server (all databases and global data) - pg_dumpall" }
] as const;

export const DEFAULT_DUMP_OPTS: PGDumpParams = {
  options: {
    command: "pg_dump",
    excludeSchema: "prostgles",
    format: "c",
    clean: true,
    ifExists: true,
    keepLogs: true,
  },
  destination: "Local",
}

const DEFAULT_DUMP_ALL_OPTS: PGDumpParams = {
  options: {
    command: "pg_dumpall",
    clean: true,
    ifExists: true,
    keepLogs: true,
  },
  destination: "Local",
}

export type DumpOptionsProps = Pick<FullExtraProps, "dbProject" | "dbs" |  "dbsTables" | "dbsMethods" | "theme"> & {
  onReadyButton?: (dumpOpts: PGDumpParams)=> React.ReactNode;
  opts?: PGDumpParams;
  onChange?: (newOpts: PGDumpParams) => void;
  connectionId: string;
  hideDestination: boolean;
}
export const DumpOptions = (props: DumpOptionsProps) => {
  const {  
    opts,
    onReadyButton,
    onChange,
    dbsMethods,
    dbProject,
    connectionId,
    hideDestination = false
  } = props;

  const [currOpts, setCurrOpts] = useState(opts ?? DEFAULT_DUMP_OPTS);
  const { options: o, destination, credentialID } = currOpts;
  const _onChange = (_newOpts: Partial<PGDumpParams>) => {
    if(_newOpts.options?.clean){
      _newOpts.options.dataOnly = false;
    } else if(_newOpts.options?.dataOnly){
      _newOpts.options.clean = false;
      _newOpts.options.ifExists = false;
    }
    const newOpts: PGDumpParams = { ...currOpts, ..._newOpts };
    setCurrOpts(newOpts);
    onChange?.(newOpts)
  };

  const onChangeOptions = (newOpts: Partial<PGDumpParams["options"]>, overwrite = false) => _onChange({ options: overwrite? newOpts : { ...o, ...newOpts } as any})

  const dumpAll = o.command === "pg_dumpall";
  const err = (destination === "Cloud" && !credentialID)? "Must select an S3 credential first" : null;

  return <div className="DumpOptions flex-col gap-1 min-s-0 o-auto bg-inherit" style={{ maxHeight: "800px"}}>
    <DumpRestoreAlerts {...{dbsMethods, connectionId, dbProject } } />
    <Select className="mr-1"
      label="Data from"
      fullOptions={DUMP_COMMANDS}
      value={o.command}
      onChange={command => {
        const opts = command === "pg_dumpall"? DEFAULT_DUMP_ALL_OPTS.options : DEFAULT_DUMP_OPTS.options
        onChangeOptions({ ...opts, command }, true);
      }}
    />
    
    {!hideDestination && <DumpLocationOptions { ...props } currOpts={currOpts} onChangeCurrOpts={_onChange} />}

    <Section title="More options..." titleIconPath="" contentClassName="DumpOptionsMoreOptions flex-col p-1 gap-1 f-1 min-s-0 bg-inherit" >
      {o.command === "pg_dump"? <>
        <FlexRowWrap>
          <Select 
            label="File format" 
            value={o.format}
            fullOptions={FORMATS}
            onChange={format => { onChangeOptions({ format })  }} 
          />
          <Select 
            label="Number of jobs" 
            value={o.numberOfJobs}
            options={[1,2,3,4,5,6,7,8,9,10]}
            onChange={numberOfJobs => { onChangeOptions({ numberOfJobs })  }} 
          />
          <Select 
            label="Compression level" 
            value={o.compressionLevel}
            options={[0,1,2,3,4,5,6,7,8,9]}
            onChange={compressionLevel => { onChangeOptions({ compressionLevel })  }} 
          />
          <FormField value={o.excludeSchema} label="Exclude schema" 
            hint="Do not restore objects that are in the named schema"
            type="text" onChange={excludeSchema => { onChangeOptions({ excludeSchema }) }} 
          />

        </FlexRowWrap>
        <FormField asColumn={true} value={o.noOwner} type="checkbox" label="No owner" 
          onChange={noOwner => { onChangeOptions({ noOwner }) }} 
          hint="Do not output commands to set ownership of objects to match the original database" 
        />
        <FormField asColumn={true} value={o.create} type="checkbox" label="Create" 
          onChange={create => { onChangeOptions({ create }) }} 
          hint="Create the database before restoring into it. If --clean is also specified, drop and recreate the target database before connecting to it." 
        />
      </> : <>
        <FormField asColumn={true} value={o.globalsOnly} type="checkbox" label="Globals only" 
          onChange={globalsOnly => { onChangeOptions({ globalsOnly }) }} 
          hint="" 
        />
        <FormField asColumn={true} value={o.rolesOnly} type="checkbox" label="Roles only" 
          onChange={rolesOnly => { onChangeOptions({ rolesOnly }) }} 
          hint="" 
        />
      </>}
      <FormField asColumn={true} value={o.schemaOnly} type="checkbox" label="Schema only" 
        onChange={schemaOnly => { onChangeOptions({ schemaOnly }) }} 
        hint="" 
      />
      <FormField asColumn={true} value={o.encoding} type="text" label="Encoding" 
        onChange={encoding => { onChangeOptions({ encoding }) }} 
        hint="" 
      />
      <FormField asColumn={true} value={o.clean} type="checkbox" label="Clean" 
        onChange={clean => { onChangeOptions({ clean }) }} 
        hint="Drop and Create commands for database objects. Will not delete objects that don't exist in the dump file" 
      />

      <FormField asColumn={true} value={o.dataOnly} type="checkbox" label="Data only" 
        onChange={dataOnly => { onChangeOptions({ dataOnly }) }} 
        hint="" 
      />
      <FormField asColumn={true} value={o.ifExists} type="checkbox" label="If exists" 
        onChange={ifExists => { onChangeOptions({ ifExists }) }} 
        hint="Add an IF EXISTS clause to clean commands to reduce errors. Will not work for extensions" 
      />
      
      <FormField asColumn={true} value={o.keepLogs} type="checkbox" label="Keep logs" 
        onChange={keepLogs => { onChangeOptions({ keepLogs }) }} 
        hint="Save dump logs to the backup record. Useful for debugging" 
      />

      <InfoRow color="info" className="noselect">For more info on options visit <a target="_blank" href={"https://www.postgresql.org/docs/current/" + (dumpAll? "app-pg-dumpall.html" : "app-pgdump.html")}>the official site</a></InfoRow>

    </Section>
    {err? <ErrorComponent error={err} /> : onReadyButton?.({ options: o, destination, credentialID })}
  </div>
}