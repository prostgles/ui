import {
  getFunctionActionValue,
  getFunctionOptions,
} from "@common/functionOptions";
import { getActionFunctionArgs } from "@common/resolveActionFunction";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow, FlexRowWrap } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { JSONBSchema } from "@components/JSONBSchema/JSONBSchema";
import { MarkdownWithPlugins } from "@components/MarkdownWithPlugins/MarkdownWithPlugins";
import Popup from "@components/Popup/Popup";
import { mdiCheck, mdiPlay } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { ROW_ACTIONS_COLUMN } from "prostgles-client";
import type {
  AnyObject,
  ClientServerFunction,
  DBSchemaTable,
} from "prostgles-types";
import React from "react";
import SmartTable from "../SmartTable";
import { useFunctionExecution } from "./useFunctionExecution";
import { JobActionDetails } from "./JobActionDetails";
import { getJobActionFunctions } from "./getJobActionFunctions";

export const ActionPopup = ({
  title,
  buttonText,
  disabledInfo,
  details,
  method,
  record,
  onClose,
}: {
  title?: string;
  buttonText?: string;
  disabledInfo?: string;
  details?: string;
  method: ClientServerFunction;
  record?: {
    row: AnyObject;
    queryRow: AnyObject;
    table: DBSchemaTable;
    argName: string;
  };
  onClose: VoidFunction;
}) => {
  const { db, tables, methods, sql } = usePrgl();
  const functionOptions = getFunctionOptions(method);
  const actionButtonText =
    buttonText ?? functionOptions?.action.defaultValue?.text ?? "Run";
  const fixedArgs =
    record ?
      getActionFunctionArgs(method, record.argName, record.row, record.table)
    : {};
  const {
    args,
    setArgs,
    editableSchema,
    editableArgNames,
    showErrors,
    hasErrors,
    isRunning,
    execution,
    run,
  } = useFunctionExecution(method, fixedArgs);
  const markdownResult =
    (
      functionOptions?.renderOutputAsMarkdown &&
      execution.status === "success" &&
      typeof execution.result === "string"
    ) ?
      execution.result
    : undefined;
  const isComplete = markdownResult !== undefined;
  const description = details ?? method.description;
  const { row = {}, queryRow = {}, table } = record ?? {};
  const tableInfo = tables.find(({ name }) => name === table?.name);
  const summaryColumns = Array.from(
    new Set([
      tableInfo?.card?.headerColumn,
      ...(tableInfo?.card?.subHeaderColumns ?? [
        tableInfo?.card?.subHeaderColumn,
      ]),
      ...(table?.uniqueColumnGroups?.[0] ?? []),
      ...Object.keys(row),
    ]),
  )
    .filter(
      (column): column is string =>
        !!column &&
        row[column] != null &&
        ["string", "number", "boolean"].includes(typeof row[column]),
    )
    .slice(0, 3);
  const outputTableName = functionOptions?.outputTable;
  const outputTable = tables.find(({ name }) => name === outputTableName);
  const jobActions =
    method.jobControl && table ?
      getJobActionFunctions(
        methods,
        table,
        method.jobControl,
        queryRow[ROW_ACTIONS_COLUMN],
      )
    : [];

  return (
    <Popup
      data-command="ActionPopup"
      title={title ?? functionOptions?.title ?? actionButtonText}
      onClose={onClose}
      positioning="center"
      rootStyle={{ width: "min(600px, calc(100vw - 2em))" }}
      showFullscreenToggle={{
        defaultValue: false,
        getContentStyle: (fullscreen) => ({
          maxHeight: fullscreen ? "none" : "calc(100vh - 12em)",
        }),
      }}
      contentClassName="p-1 ta-left"
      footer={
        <FlexRowWrap className="jc-end w-full">
          <Btn onClick={onClose} className="mr-auto">
            {(
              method.jobControl ||
              execution.status === "success" ||
              actionButtonText === "Cancel"
            ) ?
              "Close"
            : "Cancel"}
          </Btn>
          {jobActions.map(({ methodName, argName }) => {
            const controlMethod = methods[methodName]!;
            if (!table || controlMethod === method) return null;
            const values = getFunctionActionValue(
              controlMethod,
              queryRow,
              methodName,
            );
            if (values.disabledInfo) return null;
            return (
              <Btn
                key={methodName}
                color={
                  values.color ??
                  (controlMethod.jobControl?.operation === "cancel" ?
                    "danger"
                  : "action")
                }
                variant={values.variant ?? "filled"}
                loading={values.isLoading}
                onClickPromise={async () => {
                  await controlMethod.run(
                    getActionFunctionArgs(controlMethod, argName, row, table),
                  );
                }}
              >
                {values.text ?? methodName}
              </Btn>
            );
          })}
          {!isComplete && (
            <Btn
              iconPath={mdiPlay}
              color="action"
              variant="filled"
              loading={isRunning}
              disabledInfo={
                disabledInfo ? disabledInfo
                : hasErrors && showErrors ?
                  "Complete the required fields"
                : undefined
              }
              onClick={run}
            >
              {actionButtonText}
            </Btn>
          )}
        </FlexRowWrap>
      }
    >
      <FlexCol className="gap-1 min-w-0">
        {table && (
          <section
            aria-label="Selected record"
            className="bg-color-2 rounded p-1"
          >
            <div className="text-2 font-12">
              {tableInfo?.label || table.name}
            </div>
            <div>
              {summaryColumns.map((column) => String(row[column])).join(" · ")}
            </div>
          </section>
        )}
        {!isComplete && description && (
          <MarkdownWithPlugins content={description} />
        )}
        {method.jobControl && table && (
          <JobActionDetails
            job={method.jobControl}
            row={row}
            table={table}
            onClose={onClose}
          />
        )}
        {!isComplete && !!editableArgNames.length && (
          <fieldset
            className="b-unset m-0 p-0 min-w-0"
            disabled={isRunning}
            aria-busy={isRunning}
          >
            <JSONBSchema
              schema={editableSchema}
              value={args}
              onChange={(value) => setArgs(value)}
              db={db}
              tables={tables}
              allowIncomplete={true}
              debounceInputs={false}
              showErrors={showErrors}
              schemaStyles={editableArgNames.map((name) => ({
                path: [name],
                style: { width: "100%" },
              }))}
            />
          </fieldset>
        )}
        {execution.status === "error" && (
          <ErrorComponent error={execution.error} findMsg={true} />
        )}
        {isComplete && (
          <MarkdownWithPlugins
            role="status"
            aria-label="Action result"
            content={markdownResult}
          />
        )}
        {execution.status === "success" && !isComplete && (
          <>
            <FlexRow role="status" className="text-green">
              <Icon path={mdiCheck} />
              {method.jobControl ? "Job request submitted" : "Action completed"}
            </FlexRow>
            {outputTableName && !outputTable && (
              <ErrorComponent
                error={`Results table (${outputTableName}) missing or not allowed`}
              />
            )}
            {outputTable ?
              <div style={{ height: "350px" }}>
                <SmartTable
                  title=""
                  db={db}
                  sql={sql}
                  methods={methods}
                  tableName={outputTable.name}
                  tables={tables}
                  realtime={{}}
                />
              </div>
            : execution.result != null && (
                <details open>
                  <summary className="pointer">Result</summary>
                  <pre
                    aria-label="Action result"
                    className="m-0 mt-p5 p-1 bg-color-2 rounded o-auto"
                    style={{
                      maxHeight: "300px",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {JSON.stringify(execution.result, null, 2)}
                  </pre>
                </details>
              )
            }
          </>
        )}
      </FlexCol>
    </Popup>
  );
};
