import {
  mdiDelete,
  mdiUnfoldLessHorizontal,
  mdiUnfoldMoreHorizontal,
} from "@mdi/js";
import type { AnyObject, ValidatedColumnInfo } from "prostgles-types";
import { isDefined, isObject } from "prostgles-types";
import React, { useState } from "react";
import Btn from "../../components/Btn";
import Popup from "../../components/Popup/Popup";
import { W_MethodControls } from "../W_Method/W_MethodControls";
import { JoinedRecords } from "./JoinedRecords/JoinedRecords";
import type {
  ColumnDisplayConfig,
  SmartFormProps,
  SmartFormState,
} from "./SmartForm";
import SmartFormField from "./SmartFormField/SmartFormField";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";

type P = Omit<SmartFormProps, "columns"> & {
  onSetNestedInsertData:
    | ((newData: Record<string, AnyObject[]> | undefined) => void)
    | undefined;
  onRemoveUpdate: (key: string) => void;
  columns: (ValidatedColumnInfo & ColumnDisplayConfig)[];
  state: Pick<SmartFormState, "newRow" | "action">;
  table: DBSchemaTableWJoins;
  row?: AnyObject;
};

export const SmartFormUpperFooter = (props: P) => {
  const {
    onChange,
    rowFilter,
    tableName,
    methods,
    showJoinedTables = true,
    onSetNestedInsertData,
    tables,
    table,
    theme,
    columns,
    onRemoveUpdate,
    state,
    row,
    db,
  } = props;

  const dbMethodActions = Object.entries(methods)
    .map(([methodName, _m]) => {
      if (isObject(_m) && "run" in _m) {
        const argEntries = Object.entries(_m.input);
        const thisTableArgIdx = argEntries.findIndex(
          ([_, arg]) =>
            arg.lookup?.type === "data" &&
            arg.lookup.isFullRow &&
            arg.lookup.table === tableName,
        );
        if (thisTableArgIdx > -1) {
          return {
            methodName,
            argName: argEntries[thisTableArgIdx]![0],
            arg: argEntries[thisTableArgIdx]![1],
          };
        }
      }

      return undefined;
    })
    .filter(isDefined);
  const [method, setMethod] = useState<{
    name: string;
    row: AnyObject;
    argName: string;
  }>();

  const { newRow, action } = state;

  const [collapseChanges, setcollapseChanges] = useState(false);
  const [expandJoinedRecords, setexpandJoinedRecords] = useState(false);

  const showChanges =
    onChange && action.type === "update" && Object.keys(newRow || {}).length;
  const [methodState, setMethodState] = useState<{
    args?: AnyObject | undefined;
    disabledArgs?: string[] | undefined;
  }>({});

  const { currentRow } = action;

  if (
    !(
      showJoinedTables && tables.find((t) => t.name === tableName)?.joins.length
    ) &&
    !showChanges &&
    !dbMethodActions.length
  ) {
    return null;
  }

  const methodNode = method && (
    <Popup
      onClose={() => setMethod(undefined)}
      title={method.name}
      showFullscreenToggle={{
        defaultValue: true,
      }}
    >
      <W_MethodControls
        theme={theme}
        method_name={method.name}
        fixedRowArgument={{
          argName: method.argName,
          row: method.row,
          tableName,
        }}
        db={db}
        tables={tables}
        methods={methods}
        state={methodState}
        setState={setMethodState}
        w={undefined}
      />
    </Popup>
  );

  const joinedRecords = showJoinedTables && (
    <JoinedRecords
      theme={theme}
      action={action.type}
      db={db as any}
      tables={tables}
      methods={methods}
      rowFilter={rowFilter}
      tableName={tableName}
      onSetNestedInsertData={onSetNestedInsertData}
      onToggle={setexpandJoinedRecords}
      onSuccess={props.onSuccess}
    />
  );

  const changesNode = !!showChanges && (
    <>
      <div
        className={
          "noselect flex-row ai-center pointer  " +
          (collapseChanges ? " " : "  mb-p5 ")
        }
        style={{ borderTop: "1px solid #cecece" }}
        onClick={() => setcollapseChanges(!collapseChanges)}
      >
        <h4 className="noselect  f-1 px-1">
          Changes ({Object.keys(newRow || {}).length}):
        </h4>
        <Btn
          className="f-0 "
          iconPath={
            !collapseChanges ? mdiUnfoldLessHorizontal : mdiUnfoldMoreHorizontal
          }
          title="Collapse/Expand changes"
          size="small"
        />
      </div>
      {!collapseChanges && (
        <div
          className={
            "flex-col w-full ai-start " + (showChanges ? " p-1 " : " ")
          }
        >
          {Object.keys(newRow ?? {}).map((key) => {
            if (!newRow) return null;
            const c = columns.find((c) => c.name === key);

            /**
             * What happens when the key is of a joined table (media) ????
             */
            let newVal: React.ReactNode = null,
              oldVal: React.ReactNode = null;
            if (
              !c &&
              table.info.fileTableName === key &&
              Array.isArray(newRow[key])
            ) {
              oldVal =
                !currentRow ? undefined : (
                  JSON.stringify([currentRow[key].map((m) => m.name)]).slice(
                    1,
                    -1,
                  )
                );
              newVal = JSON.stringify([newRow[key].map((m) => m.name)]).slice(
                1,
                -1,
              );
            } else {
              oldVal =
                !currentRow ? undefined : (
                  SmartFormField.renderValue(c, currentRow[key])
                );
              newVal = SmartFormField.renderValue(c, newRow[key]);
            }

            return (
              <div key={key} className="flex-row mb-p5 ai-center w-full">
                <div className="flex-col mb-p5 ta-left o-auto ">
                  <div className="text-1p5 font-14 mb-p25">
                    {c?.label || key}:{" "}
                  </div>
                  {!!currentRow && (
                    <div
                      title="Old value"
                      className=" text-danger o-auto"
                      style={{ maxHeight: "100px" }}
                    >
                      {oldVal}
                    </div>
                  )}
                  <div
                    title="New value"
                    className=" text-green o-auto"
                    style={{ maxHeight: "100px" }}
                  >
                    {newVal}
                  </div>
                </div>
                <Btn
                  iconPath={mdiDelete}
                  title="Remove update"
                  onClick={() => onRemoveUpdate(key)}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  const methodsNode = dbMethodActions.length > 0 && row && (
    <div className="dbMethodActions flex-row-wrap gap-p5 p-1">
      {dbMethodActions.map(({ methodName, arg, argName }, i) => {
        const { lookup } = arg;
        const showInRowCard =
          lookup?.type !== "data" ? undefined : lookup.showInRowCard;
        return (
          <Btn
            key={i}
            color={showInRowCard?.actionColor ?? "action"}
            variant="filled"
            onClick={() => {
              setMethod({ name: methodName, row, argName });
            }}
          >
            {showInRowCard?.actionLabel ?? methodName}
          </Btn>
        );
      })}
    </div>
  );

  if (!(methodNode || joinedRecords || changesNode || methodsNode)) return null;

  return (
    <div
      className={
        "SmartFormUpperFooter flex-col o-auto min-h-0 min-w-0 w-full f-0 bg-popup-content"
      }
      style={{
        boxShadow: "0px 3px 9px 0px var(--shadow0)",
        clipPath: "inset(-10px 1px 0px 1px)",
        minHeight: "1px",
        ...(expandJoinedRecords && {
          flex: 4,
          maxHeight: "fit-content",
        }),
      }}
    >
      {methodNode}
      {joinedRecords}
      {changesNode}
      {methodsNode}
    </div>
  );
};
