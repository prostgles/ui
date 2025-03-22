import type { AnyObject } from "prostgles-types";
import { isDefined, isObject } from "prostgles-types";
import React, { useState } from "react";
import Btn from "../../components/Btn";
import Popup from "../../components/Popup/Popup";
import { W_MethodControls } from "../W_Method/W_MethodControls";
import { JoinedRecords } from "./JoinedRecords/JoinedRecords";
import { useActiveJoinedRecordsTab } from "./JoinedRecords/useActiveJoinedRecordsTab";
import type { SmartFormProps } from "./SmartForm";
import type { NewRow, NewRowDataHandler } from "./SmartFormNewRowDataHandler";
import type { SmartFormModeState } from "./useSmartFormMode";
import type { SmartFormState } from "./useSmartForm";

export type SmartFormUpperFooterProps = Omit<SmartFormProps, "columns"> &
  SmartFormState;

export const SmartFormUpperFooter = (props: SmartFormUpperFooterProps) => {
  const {
    onChange,
    rowFilter,
    tableName,
    methods,
    showJoinedTables = true,
    newRowDataHandler,
    tables,
    connection,
    newRowData,
    mode,
    row,
    db,
    modeType,
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

  const showChanges =
    onChange && mode.type === "update" && Object.keys(newRowData ?? {}).length;
  const [methodState, setMethodState] = useState<{
    args?: AnyObject | undefined;
    disabledArgs?: string[] | undefined;
  }>({});

  const rootDivRef = React.useRef<HTMLDivElement>(null);
  const { activeJoinedRecordsTab, setActiveJoinedRecordsTab } =
    useActiveJoinedRecordsTab({
      rootDivRef,
      tableName,
      tables,
      actionType: mode.type,
    });

  if (
    !(
      showJoinedTables && tables.find((t) => t.name === tableName)?.joins.length
    ) &&
    !showChanges &&
    !dbMethodActions.length
  ) {
    return null;
  }

  const showMethods = dbMethodActions.length > 0 && row;

  if (!(method || showJoinedTables || showMethods)) return null;

  return (
    <div
      className={
        "SmartFormUpperFooter flex-col o-auto min-h-0 min-w-0 w-full f-0 bg-popup-content"
      }
      ref={rootDivRef}
      style={{
        boxShadow: "0px 3px 9px 0px var(--shadow0)",
        clipPath: "inset(-10px 1px 0px 1px)",
        minHeight: "1px",
        /** Expand full allowed height to prevent size change when toggling joined records sections */
        ...(activeJoinedRecordsTab && {
          flex: 1,
        }),
      }}
    >
      {method && (
        <Popup
          onClose={() => setMethod(undefined)}
          title={method.name}
          showFullscreenToggle={{
            defaultValue: true,
          }}
        >
          <W_MethodControls
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
      )}
      {showJoinedTables && (
        <JoinedRecords
          modeType={modeType}
          db={db}
          tables={tables}
          methods={methods}
          rowFilter={rowFilter}
          newRowData={newRowData}
          tableName={tableName}
          newRowDataHandler={newRowDataHandler}
          onTabChange={setActiveJoinedRecordsTab}
          activeTabKey={activeJoinedRecordsTab}
          onSuccess={props.onSuccess}
          connection={connection}
          parentForm={props.parentForm}
        />
      )}
      {showMethods && (
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
      )}
    </div>
  );
};

// const changesNode = !!showChanges && (
//   <>
//     <div
//       className={
//         "noselect flex-row ai-center pointer  " +
//         (collapseChanges ? " " : "  mb-p5 ")
//       }
//       style={{ borderTop: "1px solid #cecece" }}
//       onClick={() => setcollapseChanges(!collapseChanges)}
//     >
//       <h4 className="noselect  f-1 px-1">
//         Changes ({Object.keys(newRowData || {}).length}):
//       </h4>
//       <Btn
//         className="f-0 "
//         iconPath={
//           !collapseChanges ? mdiUnfoldLessHorizontal : mdiUnfoldMoreHorizontal
//         }
//         title="Collapse/Expand changes"
//         size="small"
//       />
//     </div>
//     {!collapseChanges && (
//       <div
//         className={
//           "flex-col w-full ai-start " + (showChanges ? " p-1 " : " ")
//         }
//       >
//         {Object.keys(newRowData ?? {}).map((key) => {
//           if (!newRowData) return null;
//           const c = columns.find((c) => c.name === key);

//           /**
//            * What happens when the key is of a joined table (media) ????
//            */
//           let newVal: React.ReactNode = null,
//             oldVal: React.ReactNode = null;
//           if (
//             !c &&
//             table.info.fileTableName === key &&
//             Array.isArray(newRowData[key]?.value)
//           ) {
//             oldVal =
//               !currentRow ? undefined : (
//                 JSON.stringify([currentRow[key].map((m) => m.name)]).slice(
//                   1,
//                   -1,
//                 )
//               );
//             newVal = JSON.stringify([
//               newRowData[key].value.map((m) => m.name),
//             ]).slice(1, -1);
//           } else {
//             oldVal =
//               !currentRow ? undefined : (
//                 <RenderValue column={c} value={currentRow[key]} />
//               );
//             newVal = (
//               <RenderValue column={c} value={newRowData[key]?.value} />
//             );
//           }

//           return (
//             <div key={key} className="flex-row mb-p5 ai-center w-full">
//               <div className="flex-col mb-p5 ta-left o-auto ">
//                 <div className="text-1p5 font-14 mb-p25">
//                   {c?.label || key}:{" "}
//                 </div>
//                 {!!currentRow && (
//                   <div
//                     title="Old value"
//                     className=" text-danger o-auto"
//                     style={{ maxHeight: "100px" }}
//                   >
//                     {oldVal}
//                   </div>
//                 )}
//                 <div
//                   title="New value"
//                   className=" text-green o-auto"
//                   style={{ maxHeight: "100px" }}
//                 >
//                   {newVal}
//                 </div>
//               </div>
//               <Btn
//                 iconPath={mdiDelete}
//                 title="Remove update"
//                 onClick={() => onRemoveUpdate(key)}
//               />
//             </div>
//           );
//         })}
//       </div>
//     )}
//   </>
// );
