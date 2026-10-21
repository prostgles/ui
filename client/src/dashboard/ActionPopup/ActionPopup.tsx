import { getFunctionOptions } from "@common/functionOptions";
import { getActionLookupRow } from "@common/resolveActionFunction";
import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import { Icon } from "@components/Icon/Icon";
import { JSONBSchema } from "@components/JSONBSchema/JSONBSchema";
import Popup from "@components/Popup/Popup";
import { mdiCheck, mdiPlay } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import type {
  AnyObject,
  ClientServerFunction,
  DBSchemaTable,
} from "prostgles-types";
import React from "react";
import SmartTable from "../SmartTable";
import { useFunctionExecution } from "./useFunctionExecution";

export const ActionPopup = ({
  title,
  method,
  row,
  table,
  argName,
  onClose,
}: {
  title: string;
  method: ClientServerFunction;
  row: AnyObject;
  table: DBSchemaTable;
  argName: string;
  onClose: VoidFunction;
}) => {
  const { db, tables, methods, sql } = usePrgl();
  const input = method.input?.[argName];
  const fixedArgs = {
    [argName]:
      typeof input !== "string" && input?.type === "ValueLookup" ?
        row[input.column]
      : getActionLookupRow(row, table, method),
  };
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
  const tableInfo = tables.find(({ name }) => name === table.name);
  const summaryColumns = Array.from(
    new Set([
      tableInfo?.card?.headerColumn,
      tableInfo?.card?.subHeaderColumn,
      ...(table.uniqueColumnGroups?.[0] ?? []),
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
  const outputTableName = getFunctionOptions(method)?.outputTable;
  const outputTable = tables.find(({ name }) => name === outputTableName);

  return (
    <Popup
      data-command="ActionPopup"
      title={title}
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
        <FlexRow className="jc-end w-full">
          <Btn onClick={onClose}>
            {execution.status === "success" ? "Close" : "Cancel"}
          </Btn>
          <Btn
            iconPath={mdiPlay}
            color="action"
            variant="filled"
            loading={isRunning}
            disabledInfo={
              hasErrors && showErrors ?
                "Complete the required fields"
              : undefined
            }
            onClick={run}
          >
            Run
          </Btn>
        </FlexRow>
      }
    >
      <FlexCol className="gap-1 min-w-0">
        <section
          aria-label="Selected record"
          className="bg-color-2 rounded p-1"
        >
          <div className="text-2 font-12">{tableInfo?.label || table.name}</div>
          <div>
            {summaryColumns.map((column) => String(row[column])).join(" · ")}
          </div>
        </section>
        {!!editableArgNames.length && (
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
        {execution.status === "success" && (
          <>
            <FlexRow role="status" className="text-green">
              <Icon path={mdiCheck} />
              Action completed
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
