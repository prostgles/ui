import type { Connections } from "..";
import { getDatabaseConfigFilter } from "../ConnectionManager/connectionManagerUtils";
import type BackupManager from "./BackupManager";
import { HOUR } from "./BackupManager";

export async function checkAutomaticBackup(
  this: BackupManager,
  con: Connections,
) {
  const AUTO_INITIATOR = "automatic_backups";
  const dbConf = await this.dbs.database_configs.findOne(
    getDatabaseConfigFilter(con) as any,
  );
  const bkpConf = dbConf?.backups_config;
  if (!bkpConf?.dump_options) return;

  const bkpFilter = { connection_id: con.id, initiator: AUTO_INITIATOR };

  const dump = async () => {
    const lastBackup = await this.dbs.backups.findOne(bkpFilter, {
      orderBy: { created: -1 },
    });
    if (bkpConf.err)
      await this.dbs.database_configs.update(
        { $existsJoined: { connections: { id: con.id } } },
        { backups_config: { ...bkpConf, err: null } },
      );

    const hourIsOK = () => {
      if (Number.isInteger(bkpConf.hour)) {
        if (now.getHours() >= bkpConf.hour!) {
          return true;
        }
      } else {
        return true;
      }

      return false;
    };
    const dowIsOK = () => {
      if (Number.isInteger(bkpConf.dayOfWeek)) {
        if ((now.getDay() || 7) >= bkpConf.dayOfWeek!) {
          return true;
        }
      } else {
        return true;
      }

      return false;
    };
    const dateIsOK = () => {
      const date = new Date();

      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      if (bkpConf.dayOfMonth && Number.isInteger(bkpConf.dayOfMonth)) {
        if (
          now.getDate() >= bkpConf.dayOfMonth ||
          (bkpConf.dayOfMonth > lastDay.getDate() &&
            now.getDate() === lastDay.getDate())
        ) {
          return true;
        }
      } else {
        return true;
      }

      return false;
    };

    let shouldDump = false;
    const now = new Date();
    const currentBackup = await this.getCurrentBackup(con.id);
    if (currentBackup) {
      shouldDump = false;
    } else if (
      bkpConf.frequency === "hourly" &&
      (!lastBackup ||
        new Date(lastBackup.created) < new Date(Date.now() - HOUR))
    ) {
      shouldDump = true;
    } else if (
      hourIsOK() &&
      bkpConf.frequency === "daily" &&
      (!lastBackup ||
        new Date(lastBackup.created) < new Date(Date.now() - 24 * HOUR))
    ) {
      shouldDump = true;
    } else if (
      dowIsOK() &&
      hourIsOK() &&
      bkpConf.frequency === "weekly" &&
      (!lastBackup ||
        new Date(lastBackup.created) < new Date(Date.now() - 7 * 24 * HOUR))
    ) {
      shouldDump = true;
    } else if (
      dateIsOK() &&
      dowIsOK() &&
      hourIsOK() &&
      bkpConf.frequency === "monthly" &&
      (!lastBackup ||
        new Date(lastBackup.created) < new Date(Date.now() - 28 * 24 * HOUR))
    ) {
      shouldDump = true;
    }

    if (shouldDump) {
      await this.pgDump(con.id, null, {
        options: { ...bkpConf.dump_options! },
        destination: bkpConf.cloudConfig ? "Cloud" : "Local",
        credentialID: bkpConf.cloudConfig?.credential_id,
        initiator: AUTO_INITIATOR,
      });
      if (bkpConf.keepLast && bkpConf.keepLast > 0) {
        const toKeepIds: string[] = (
          await this.dbs.backups.find(bkpFilter, {
            select: { id: 1 },
            orderBy: { created: -1 },
            limit: bkpConf.keepLast,
          })
        ).map((c) => c.id);
        await this.dbs.backups.delete({ "id.$nin": toKeepIds, ...bkpFilter });
      }
    }
  };

  /** Local backup, check if enough space */
  if (!bkpConf.cloudConfig?.credential_id) {
    const space = await this.checkIfEnoughSpace(con.id);
    if (space.err) {
      if (bkpConf.err !== space.err) {
        await this.dbs.database_configs.update(
          { id: dbConf!.id },
          { backups_config: { ...bkpConf, err: space.err } },
        );
      }
    } else {
      await dump();
    }
  } else {
    await dump();
  }
}
