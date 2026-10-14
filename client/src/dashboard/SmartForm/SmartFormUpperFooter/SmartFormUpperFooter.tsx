import type { AnyObject } from "prostgles-types";
import { getActionFunctions, isObject } from "prostgles-types";
import { ROW_ACTIONS_COLUMN } from "prostgles-client";
import { getFunctionActionValue } from "@common/functionOptions";
import { getActionLookupRow } from "@common/resolveActionFunction";
import { SvgIcon } from "@components/SvgIcon";
import React, { useEffect, useState } from "react";
import Btn from "@components/Btn";
import Popup from "@components/Popup/Popup";
import { W_MethodControls } from "../../W_Method/W_MethodControls";
import { JoinedRecords } from "../JoinedRecords/JoinedRecords";
import { useActiveJoinedRecordsTab } from "./useActiveJoinedRecordsTab";
import type { SmartFormProps } from "../SmartForm";
import type { SmartFormState } from "../useSmartForm";

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
    newRowData,
    mode,
    row,
    db,
    modeType,
    sql,
  } = props;

  const table = tables.find((table) => table.name === tableName);
  const allowedActions = row[ROW_ACTIONS_COLUMN] as string[] | undefined;
  const dbMethodActions =
    table ?
      getActionFunctions(methods, table).filter(({ methodName }) =>
        allowedActions?.includes(methodName),
      )
    : [];

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
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    const onClickListener = ({ target }: MouseEvent) => {
      if (!rootDivRef.current) return;
      if (rootDivRef.current.contains(target as Node)) {
        setIsFocused(true);
      } else {
        setIsFocused(false);
      }
    };

    document.addEventListener("click", onClickListener);
    return () => {
      document.removeEventListener("click", onClickListener);
    };
  }, [method]);

  const { activeJoinedRecordsTab, setActiveJoinedRecordsTab } =
    useActiveJoinedRecordsTab({
      rootDivRef,
      tableName,
      tables,
      actionType: mode.type,
    });

  if (
    !(
      showJoinedTables &&
      tables.find((t) => t.name === tableName)?.joinsV2.length
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
        "SmartFormUpperFooter bt b-color-0 max-h-fit flex-col o-auto min-h-0 min-w-0 w-full f-0 bg-popup-content"
      }
      ref={rootDivRef}
      style={{
        /** Replaced shadow with ScrollFade */
        // boxShadow: "0px 3px 9px 0px var(--shadow0)",
        // clipPath: "inset(-10px 1px 0px 1px)",
        minHeight: "1px",
        flex: isFocused ? 1 : 0.3,
        /** Expand full allowed height to prevent size change when toggling joined records sections */
        // ...(activeJoinedRecordsTab && {
        //   flex: 1,
        // }),
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
          sql={sql}
          tables={tables}
          tablesToShow={
            isObject(showJoinedTables) ? showJoinedTables : undefined
          }
          methods={methods}
          rowFilter={rowFilter}
          newRowData={newRowData}
          tableName={tableName}
          newRowDataHandler={newRowDataHandler}
          onTabChange={setActiveJoinedRecordsTab}
          activeTabKey={activeJoinedRecordsTab}
          onSuccess={props.onSuccess}
          parentForm={props.parentForm}
          errors={props.errors}
          row={row}
        />
      )}
      {showMethods && (
        <div className="dbMethodActions flex-row-wrap gap-p5 p-1">
          {dbMethodActions.map(({ methodName, lookup, argName }) => {
            const showInRowCard = lookup.showInRowCard;
            const values = getFunctionActionValue(
              methods[methodName],
              row,
              methodName,
            );
            return (
              <Btn
                key={`${methodName}:${argName}`}
                color={values.color ?? showInRowCard?.actionColor ?? "action"}
                variant={values.variant ?? "filled"}
                loading={values.isLoading ? "allow-clicking" : false}
                disabledInfo={values.disabledInfo}
                iconNode={
                  values.icon ?
                    <SvgIcon icon={values.icon} size={16} />
                  : undefined
                }
                onClick={() => {
                  setMethodState({});
                  setMethod({
                    name: methodName,
                    row:
                      lookup.type === "RowLookup" && table ?
                        getActionLookupRow(row, table)
                      : row,
                    argName,
                  });
                }}
              >
                {values.text ?? showInRowCard?.actionLabel ?? methodName}
              </Btn>
            );
          })}
        </div>
      )}
    </div>
  );
};
