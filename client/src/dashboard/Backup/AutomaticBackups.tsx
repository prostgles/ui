
import { mdiRefreshAuto } from "@mdi/js";
import React, { useState } from "react";
import type { ExtraProps, Prgl } from "../../App";
import Btn from "../../components/Btn";
import { InfoRow } from "../../components/InfoRow";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";

const DESTINATIONS = [
  { key: "Local", subLabel: "Saved locally (server in address bar)" },
  { key: "Cloud", subLabel: "Saved to Amazon S3" }
] as const;

const BACKUP_FREQUENCIES = [
  { key: "hourly", label: "Hourly" },
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" }
] as const;
const DAYS_OF_WEEK = [
  { key: 1, label: "Monday"},
  { key: 2, label: "Tuesday"},
  { key: 3, label: "Wednesday"},
  { key: 4, label: "Thursday"},
  { key: 5, label: "Friday"},
  { key: 6, label: "Saturday"},
  { key: 7, label: "Sunday"},
] as const;
 
import type { DBSSchema } from "../../../../commonTypes/publishUtils";
import type { PGDumpParams } from "../../../../commonTypes/utils";
import FormField from "../../components/FormField/FormField";
import { CredentialSelector } from "./CredentialSelector";
import { DEFAULT_DUMP_OPTS, DumpOptions } from "./DumpOptions";

type P = Pick<Prgl, "db" | "dbs" | "dbsMethods" | "dbsTables" | "theme"> & { 
  connectionId: string;
};
export const AutomaticBackups = ({ dbs, dbsTables, dbsMethods, connectionId: connection_id, theme, db }: P) => {

  const [dumpOpts, setDumpOpts] = useState<PGDumpParams>(DEFAULT_DUMP_OPTS);

  const { data: database_config } = dbs.database_configs.useSubscribeOne({ $existsJoined: { connections:  { id: connection_id } } }, {});

  const setBackupConf = (newBackupConfig: Partial<DBSSchema["database_configs"]["backups_config"]>, merge = true) => {
    if(!database_config) throw "database_config missing";
    const { backups_config } = database_config;
    return dbs.database_configs.update(
      { id: database_config.id }, 
      { backups_config: {
        frequency: newBackupConfig?.frequency ?? "daily",
        dump_options: DEFAULT_DUMP_OPTS.options,
        ...(!merge? {} : (backups_config ?? {})),
        ...newBackupConfig,
        cloudConfig: newBackupConfig?.cloudConfig || null, 
      }
    })
  }

  const bkpConf = database_config?.backups_config;
  const noSpaceForAutomaticLocalBackups = bkpConf?.err && !bkpConf.cloudConfig?.credential_id && bkpConf.enabled;
  
  return <PopupMenu 
    title="Automatic backups"
    button={
      <Btn iconPath={mdiRefreshAuto}  
        variant={bkpConf?.enabled? "filled" : "outline"} 
        color={noSpaceForAutomaticLocalBackups? "danger" : "action"} 
        className="mr-1"
        data-command="config.bkp.AutomaticBackups"
      >
        {bkpConf?.enabled? `Automatic backups: ${bkpConf.frequency}` : `Enable automatic backups`}
      </Btn>
    } 
    clickCatchStyle={{ opacity: 1 }}
    positioning="beneath-left"
    footerButtons={_popupClose => [
      { label: "Close", onClickClose: true },
      { 
        label: bkpConf?.enabled? "Disable" : "Enable", 
        color: bkpConf?.enabled? "warn" : "action",
        variant: "filled",
        "data-command": "config.bkp.AutomaticBackups.toggle",
        onClickPromise: async (e) => {
          await setBackupConf({ 
            enabled: !bkpConf?.enabled,
            dump_options: bkpConf?.dump_options ?? DEFAULT_DUMP_OPTS.options
          });
          _popupClose?.(e);
        } 
      },
    ]}
    render={() => (
      <div className="flex-col gap-1 p-1 bg-inherit">

        {noSpaceForAutomaticLocalBackups && <InfoRow color="danger">{bkpConf.err}</InfoRow>}
        <Select 
          className="mr-1"
          label="Destination"
          data-command="AutomaticBackups.destination"
          fullOptions={DESTINATIONS}
          value={database_config?.backups_config?.cloudConfig? "S3" : "Local"}
          onChange={o => {
            setBackupConf({ cloudConfig: o === "Cloud"? {} : null })
          }}
        />
        {!!database_config?.backups_config?.cloudConfig && <CredentialSelector 
          theme={theme}
          dbs={dbs} 
          dbsTables={dbsTables} 
          dbsMethods={dbsMethods} 
          selectedId={database_config.backups_config.cloudConfig.credential_id || undefined} 
          onChange={credential_id => {
            if(credential_id) setBackupConf({ cloudConfig: { credential_id } })
          }} 
        />}
        <Select 
          label="Frequency"
          data-command="AutomaticBackups.frequency"
          fullOptions={BACKUP_FREQUENCIES} 
          value={database_config?.backups_config?.frequency} 
          onChange={frequency => {
            setBackupConf({ frequency })
          }}
        />
        {bkpConf?.frequency && <>
          <FormField  
            type="number" 
            inputProps={{ min: 1, max: 200 }} 
            label="Keep last" 
            hint="Will delete older automatic backups except top N. 0 means nothing will get deleted" 
            value={bkpConf.keepLast}
            onChange={keepLast => {
              setBackupConf({ keepLast: +keepLast })
            }}
          />
          {bkpConf.frequency !== "hourly" && 
            <Select label="Hour of day for backup" 
              data-command="AutomaticBackups.hourOfDay"
              options={(new Array(24)).fill(1).map((_, i) => i)}
              value={bkpConf.hour} 
              onChange={hour => {
                setBackupConf({ hour })
              }}
            />}
          {bkpConf.frequency === "weekly" && <Select label="Day of week for backup" 
            fullOptions={DAYS_OF_WEEK}
            value={bkpConf.dayOfWeek} 
            onChange={dayOfWeek => {
              setBackupConf({ dayOfWeek })
            }}
          />}
          {bkpConf.frequency === "monthly" && <Select label="Day of month for backup" 
            options={(new Array(31)).fill(1).map((_, i) => i + 1)}
            value={bkpConf.dayOfMonth} 
            onChange={dayOfMonth => {
              setBackupConf({ dayOfMonth })
            }}
          />}
          <DumpOptions 
            theme={theme}
            connectionId={connection_id}
            dbsMethods={dbsMethods}
            dbs={dbs} 
            dbProject={db}
            dbsTables={dbsTables}
            opts={dumpOpts}
            onChange={setDumpOpts}
            hideDestination={true}
          />
        </>}
      </div>
    )}
  />
}
