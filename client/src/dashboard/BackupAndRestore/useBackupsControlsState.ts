import { useMemo, useState } from "react";

export type BackupsControlsState = ReturnType<typeof useBackupsControlsState>;
export const useBackupsControlsState = (connection_id: string) => {
  const [backupsFilterType, setBackupsFilterType] = useState<
    (typeof BACKUP_FILTER_OPTS)[number]["key"]
  >(BACKUP_FILTER_OPTS[0].key);
  const [hasBackups, setHasBackups] = useState(false);

  const { backupFilter, completedBackupsFilter } = useMemo(() => {
    const backupFilter =
      backupsFilterType === "This connection" ? { connection_id }
      : backupsFilterType === "Deleted connections" ? { connection_id: null }
      : {};
    const completedBackupsFilter = {
      $and: [backupFilter, { "status->ok": { "<>": null } }],
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
