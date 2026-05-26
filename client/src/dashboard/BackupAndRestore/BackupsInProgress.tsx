import type { DBSSchema } from "@common/publishUtils";
import Btn from "@components/Btn";
import { mdiStop } from "@mdi/js";
import type { AnyObject } from "prostgles-types";
import React, { useMemo } from "react";
import type { Prgl } from "../../App";
import {
  SmartCardList,
  type SmartCardListProps,
} from "../SmartCardList/SmartCardList";
import { StyledInterval, type PG_Interval } from "../W_SQL/customRenderers";
import { orderByCreated } from "./BackupsControls";
import { RenderBackupLogs } from "./RenderBackupLogs";
import { RenderBackupStatus } from "./RenderBackupStatus";

export const BackupsInProgress = ({
  dbs,
  dbsMethods,
  dbsTables,
  backupFilter,
  dbsMethodSchema,
  dbsSql,
}: Prgl & {
  backupFilter: AnyObject;
}) => {
  const props = useMemo(() => {
    return {
      style: { minHeight: "250px" },
      filter: {
        $and: [backupFilter, { status: { "@>": { state: "loading" } } }],
      },
      fieldConfigs: [
        { name: "id", hide: true },
        { name: "sizeInBytes", hide: true },
        { name: "dbSizeInBytes", hide: true },
        { name: "name" },
        {
          name: "created_ago" as "created",
          label: "Started",
          select: { $ageNow: ["created", null, "second"] },
          render: (value: PG_Interval) => <StyledInterval value={value} />,
        },
        {
          name: "status",
          className: "gap-p25",
          label: "Dump status",
          render: (val, row) => <RenderBackupStatus row={row} status={val} />,
        },
        {
          name: "dump_logs",
          render: (logs: string, row) => (
            <RenderBackupLogs
              logs={logs}
              completed={row.status.state !== "loading"}
            />
          ),
        },
      ],
      getRowFooter: (row) => (
        <div className="flex-row-wrap gap-1 jc-end ai-center">
          <Btn
            iconPath={mdiStop}
            variant="outline"
            color="danger"
            onClickPromise={async () => {
              await dbsMethods.bkpDelete!({ bkpId: row.id, force: true });
            }}
          >
            Stop & delete
          </Btn>
        </div>
      ),
      noDataComponent: <></>,
    } satisfies Pick<
      SmartCardListProps<DBSSchema["backups"]>,
      "style" | "filter" | "fieldConfigs" | "getRowFooter" | "noDataComponent"
    >;
  }, [backupFilter, dbsMethods.bkpDelete]);

  return (
    <SmartCardList<DBSSchema["backups"]>
      db={dbs}
      sql={dbsSql}
      methods={dbsMethodSchema}
      tableName="backups"
      btnColor="gray"
      title="Backup in progress:"
      showTopBar={false}
      tables={dbsTables}
      realtime={true}
      className="mt-2"
      orderBy={orderByCreated}
      excludeNulls={true}
      {...props}
      noDataComponentMode="hide-all"
    />
  );
};
