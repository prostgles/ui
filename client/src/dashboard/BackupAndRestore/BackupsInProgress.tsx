import { mdiStop } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { AnyObject } from "prostgles-types";
import React, { useMemo } from "react";
import type { DBSSchema } from "../../../../common/publishUtils";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import {
  SmartCardList,
  type SmartCardListProps,
} from "../SmartCardList/SmartCardList";
import { StyledInterval } from "../W_SQL/customRenderers";
import { orderByCreated } from "./BackupsControls";
import { RenderBackupLogs } from "./RenderBackupLogs";
import { RenderBackupStatus } from "./RenderBackupStatus";

export const BackupsInProgress = ({
  dbs,
  dbsMethods,
  dbsTables,
  backupFilter,
}: Prgl & {
  backupFilter: AnyObject;
}) => {
  const props = useMemo(() => {
    return {
      style: { minHeight: "250px" },
      filter: { $and: [backupFilter, { "status->ok": null }] },
      fieldConfigs: [
        { name: "id", hide: true },
        { name: "sizeInBytes", hide: true },
        { name: "dbSizeInBytes", hide: true },
        {
          name: "status",
          label: "Dump status",
          render: (val, row) => <RenderBackupStatus row={row} status={val} />,
        },
        {
          name: "created_ago",
          label: "Started",
          select: { $ageNow: ["created", null, "second"] },
          render: (value) => <StyledInterval value={value} />,
        },
        {
          name: "dump_logs",
          render: (logs, row) => (
            <RenderBackupLogs
              logs={logs}
              completed={!(row.status as any)?.loading}
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
              await dbsMethods.bkpDelete!(row.id, true);
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
      db={dbs as DBHandlerClient}
      methods={dbsMethods}
      tableName="backups"
      btnColor="gray"
      title="Backup in progress:"
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
