import ErrorComponent from "@components/ErrorComponent";
import { FlexCol } from "@components/Flex";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { useSubscribe } from "prostgles-client";
import type {
  AnyObject,
  DBSchemaTable,
  JobControlBinding,
} from "prostgles-types";
import React from "react";
import { ActionColumnChats } from "../W_Table/ColumnMenu/ColumnDisplayFormat/ActionColumnChats";

export const JobActionDetails = ({
  job,
  row,
  table,
  onClose,
}: {
  job: JobControlBinding;
  row: AnyObject;
  table: DBSchemaTable;
  onClose: VoidFunction;
}) => {
  const { db } = usePrgl();
  const jobId = row[job.columnName];
  const subscribe = db[job.tableName]?.subscribe;
  const {
    data: jobRow,
    error,
    isLoading,
  } = useSubscribe(
    subscribe!,
    true,
    { id: jobId },
    { select: "*" },
    { skip: !jobId || !subscribe },
  );
  return (
    <section aria-label="Job details">
      <FlexCol className="gap-p5">
        <ErrorComponent error={error} />
        {!jobId ?
          <div>Job has not started</div>
        : jobRow ?
          <>
            <div>
              Status: <strong>{jobRow.status}</strong>
            </div>
            {jobRow.progress_message && <div>{jobRow.progress_message}</div>}
            {jobRow.progress_numeric && (
              <div>
                Progress: {jobRow.progress_numeric.done} /{" "}
                {jobRow.progress_numeric.total}
              </div>
            )}
            {jobRow.attempts != null && <div>Attempts: {jobRow.attempts}</div>}
            {jobRow.error && (
              <ErrorComponent error={jobRow.error} findMsg={true} />
            )}
          </>
        : <div>
            {!subscribe || error || !isLoading ?
              "Job details unavailable"
            : "Loading job details..."}
          </div>
        }
        <ActionColumnChats row={row} table={table} onOpen={onClose} />
      </FlexCol>
    </section>
  );
};
