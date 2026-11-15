import { sliceText } from "@common/utils";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import Popup from "@components/Popup/Popup";
import { Select } from "@components/Select/Select";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import {
  defineJoin,
  pickKeys,
  type AnyObject,
  type DBSchemaTable,
} from "prostgles-types";
import React, { useState } from "react";
import { AgenticWorkflow } from "../../../AskLLM/Chat/AskLLMChatMessages/ProstglesToolUseMessage/ProstglesMCPTools/AgenticWorkflow/AgenticWorkflow";
import { ActionColumnChats } from "./ActionColumnChats";

export const ActionColumnWorkflows = ({
  row,
  table,
  onOpen,
  invocationId,
}: {
  row: AnyObject;
  table: DBSchemaTable;
  onOpen: VoidFunction;
  invocationId?: string;
}) => {
  const { dbs, connectionId } = usePrgl();
  const [selectedRun, setSelectedRun] = useState<{
    id: number;
    workflow_id: number;
  }>();
  const identityColumnGroups =
    table.uniqueColumnGroups?.filter(
      (columns) =>
        columns.length && columns.every((column) => row[column] != null),
    ) ?? [];
  const { data: runs, error } = dbs.agentic_workflow_runs.useSubscribe(
    {
      $and: [
        {
          $existsJoined: { agentic_workflows: { connection_id: connectionId } },
        },
        invocationId ?
          { invocation_id: invocationId }
        : {
            $or: identityColumnGroups.map((columns) => ({
              related_records: {
                "@>": [{ tableName: table.name, row: pickKeys(row, columns) }],
              },
            })),
          },
      ],
    },
    {
      select: {
        "*": 1,
        agentic_workflows: defineJoin({
          $leftJoin: "agentic_workflows",
          select: { source_key: 1, name: 1 },
        }),
      },
      orderBy: { created: -1 },
    },
    { skip: !invocationId && !identityColumnGroups.length },
  );
  return (
    <>
      <ErrorComponent error={error} />
      {!!runs?.length && (
        <section
          className="flex-col gap-p5 mt-1"
          aria-label="Related workflows"
        >
          <h4 className="m-0">Related workflows</h4>
          {runs.map((run) => {
            const [workflow] = run.agentic_workflows;
            const statusMessage =
              run.state.message ??
              (run.state.status === "error" ?
                run.log.findLast(
                  ({ type }) => type === "error" || type === "stderr",
                )?.text
              : undefined);
            return (
              <Btn
                key={run.id}
                label={{
                  label: `Run ${run.id} · ${run.state.status} · ${new Date(run.created).toLocaleString()}`,
                  size: "small",
                }}
                variant="faded"
                color={
                  run.state.status === "completed" ? "green"
                  : run.state.status === "running" ?
                    "action"
                  : run.state.status === "stopped" ?
                    "warn"
                  : "danger"
                }
                loading={
                  run.state.status === "running" ? "allow-clicking" : false
                }
                title={statusMessage}
                onClick={() => setSelectedRun(run)}
                style={{
                  whiteSpace: "pre-wrap",
                }}
              >
                {workflow?.source_key ?? workflow?.name ?? "Workflow"} ·{" "}
                {run.state.status}
                {statusMessage && `: ${sliceText(statusMessage, 100)}`}
              </Btn>
            );
          })}
        </section>
      )}
      {!runs?.length && (
        <ActionColumnChats row={row} table={table} onOpen={onOpen} />
      )}
      {selectedRun && (
        <Popup
          title={
            <div className="flex-row ai-center gap-p5">
              Workflow run
              <Select
                size="small"
                title="Select related workflow run"
                value={selectedRun.id}
                fullOptions={(runs ?? []).map((run) => ({
                  key: run.id,
                  label: `${run.id}`,
                  subLabel: `${run.state.status} · ${new Date(run.created).toLocaleString()}`,
                }))}
                onChange={(runId) =>
                  setSelectedRun(runs?.find((run) => run.id === runId))
                }
              />
            </div>
          }
          showFullscreenToggle={{ defaultValue: true }}
          clickCatchStyle={{ opacity: 1 }}
          onClose={() => setSelectedRun(undefined)}
        >
          <AgenticWorkflow
            key={selectedRun.id}
            workflow_id={selectedRun.workflow_id}
            workflowRunId={selectedRun.id}
            chatId={undefined}
            tool_use_id={undefined}
            inputData={undefined}
            workflowValidationError={undefined}
            validatedWorkflowDataIsValid={true}
          />
        </Popup>
      )}
    </>
  );
};
