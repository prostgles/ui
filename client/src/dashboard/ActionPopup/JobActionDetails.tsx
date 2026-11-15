import type { DataRow } from "@common/utils";
import { FlexCol } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type { DBSchemaTable, JobControlBinding } from "prostgles-types";
import React from "react";
import { SmartCardList } from "../SmartCardList/SmartCardList";
import { ActionColumnWorkflows } from "../W_Table/ColumnMenu/ColumnDisplayFormat/ActionColumnWorkflows";
import { InfoRow } from "@components/InfoRow";

export const JobActionDetails = ({
  job,
  row,
  table,
  onClose,
}: {
  job: JobControlBinding;
  row: DataRow;
  table: DBSchemaTable;
  onClose: VoidFunction;
}) => {
  const prgl = usePrgl();
  const jobIdMaybe = row[job.columnName];
  const jobId = typeof jobIdMaybe === "string" ? jobIdMaybe : undefined;
  const jobTableHandler = prgl.db[job.tableName];
  const jobTable = prgl.tables.find((table) => table.name === job.tableName);
  return (
    <section aria-label="Job details" className="min-w-0">
      <FlexCol className="gap-p5">
        {!jobId ?
          <InfoRow variant="filled" color="info">
            Job has not started
          </InfoRow>
        : jobTable && jobTableHandler?.find ?
          <SmartCardList
            {...prgl}
            tableName={job.tableName}
            filter={{ id: jobId }}
            cardMode="summary"
            flat={false}
            realtime={!!jobTableHandler.subscribe}
            showTopBar={false}
            showEdit={false}
            limit={1}
            noDataComponent={<div>Job details unavailable</div>}
            noDataComponentMode="hide-all"
          />
        : <div>Job details unavailable</div>}
        <ActionColumnWorkflows
          invocationId={jobId}
          row={row}
          table={table}
          onOpen={onClose}
        />
      </FlexCol>
    </section>
  );
};
