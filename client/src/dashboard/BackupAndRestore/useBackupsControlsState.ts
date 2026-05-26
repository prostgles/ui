import { useMemo, useState } from "react";
import type { Backups } from "../Dashboard/dashboardUtils";
import type { FilterItem } from "prostgles-types";

export type BackupsControlsState = ReturnType<typeof useBackupsControlsState>;
export const useBackupsControlsState = (connection_id: string) => {
  const [backupsFilterType, setBackupsFilterType] = useState<
    (typeof BACKUP_FILTER_OPTS)[number]["key"]
  >(BACKUP_FILTER_OPTS[0].key);
  const [hasBackups, setHasBackups] = useState(false);

  const { backupFilter, completedBackupsFilter } = useMemo(() => {
    const backupFilter: FilterItem<Backups> =
      backupsFilterType === "This connection" ? { connection_id }
      : backupsFilterType === "Deleted connections" ? { connection_id: null }
      : {};
    const completedBackupsFilter = {
      $and: [
        backupFilter,
        { status: { "@>": { state: "finished" } } },
      ] satisfies FilterItem<Backups>[],
    };
    return { backupFilter, completedBackupsFilter };
  }, [backupsFilterType, connection_id]);
  return {
    completedBackupsFilter,
    backupsFilterType,
    backupFilter,
    setBackupsFilterType,
    hasBackups,
    setHasBackups,
  };
};

export const BACKUP_FILTER_OPTS = [
  { key: "This connection" },
  { key: "Deleted connections" },
  { key: "All connections" },
] as const;
