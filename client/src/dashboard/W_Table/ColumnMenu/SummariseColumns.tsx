import { mdiFunction } from "@mdi/js";
import type { ValidatedColumnInfo } from "prostgles-types";
import React, { useState } from "react";
import Btn from "../../../components/Btn";
import { FlexCol } from "../../../components/Flex";
import Popup from "../../../components/Popup/Popup";
import { SwitchToggle } from "../../../components/SwitchToggle";
import type { ColumnConfigWInfo } from "../W_Table";
import { FunctionSelector } from "./FunctionSelector";

type SummariseColumnProps = {
  tableColumns: ValidatedColumnInfo[];
  column: ColumnConfigWInfo;
  onChange: (newCols: ColumnConfigWInfo[]) => void;
  columns: ColumnConfigWInfo[];
};

export const SummariseColumn = ({
  column,
  columns,
  onChange,
  tableColumns,
}: SummariseColumnProps) => {
  const topFuncs =
    (
      column.info?.udt_name.startsWith("timestamp") ||
      column.info?.udt_name.startsWith("date")
    ) ?
      [""]
    : [];
  const otherColumnsShown = columns.some(
    (c) => c.name !== column.name && c.show,
  );
  const currFuncDef = column.computedConfig?.funcDef;
  const [funcDef, setFuncDef] = useState(currFuncDef);
  const [hideOthers, setHideOthers] = useState(false);

  const [showPopup, setShowPopup] = useState<HTMLButtonElement>();
  return (
    <>
      <Btn
        title="Apply function/summarise column"
        color="action"
        className={showPopup || funcDef ? "" : "show-on-trigger-hover"}
        iconPath={mdiFunction}
        data-command="SummariseColumn.toggle"
        onClick={(e) => setShowPopup(e.currentTarget)}
      >
        {funcDef?.label ??
          column.computedConfig?.funcDef.label ??
          `${topFuncs.join(", ")}...`}
      </Btn>
      {showPopup && (
        <Popup
          anchorEl={showPopup}
          positioning="beneath-left"
          onClose={() => setShowPopup(undefined)}
          clickCatchStyle={{ opacity: 0 }}
          contentClassName="p-0"
          footerButtons={
            !funcDef ? undefined : (
              [
                { label: "Cancel", onClickClose: true },
                {
                  label: column.nested ? "Update" : "Apply",
                  variant: "filled",
                  color: "action",
                  "data-command": "SummariseColumn.apply",
                  onClick: () => {
                    const newCol: ColumnConfigWInfo = {
                      ...column,
                      // name: funcDef? `${funcDef.label}(${column.name})` : column.name,
                      show: true,
                      computedConfig: {
                        column: column.name,
                        funcDef,
                        isColumn: true,
                      },
                    };
                    onChange(
                      columns.map((c) =>
                        c.name === column.name ? newCol
                        : hideOthers ? { ...c, show: false }
                        : c,
                      ),
                    );
                    setFuncDef(undefined);
                    setShowPopup(undefined);
                  },
                },
              ]
            )
          }
        >
          <FlexCol className={"min-h-0"}>
            <FunctionSelector
              selectedFunction={
                funcDef?.key ?? column.computedConfig?.funcDef.key
              }
              className={funcDef ? "p-1" : ""}
              column={column.name}
              tableColumns={tableColumns}
              wColumns={undefined}
              onSelect={(funcDef) => {
                setFuncDef(funcDef);
                setHideOthers(!!funcDef?.isAggregate);
              }}
            />
            {funcDef && (
              <SwitchToggle
                className="m-1"
                disabledInfo={
                  otherColumnsShown ? undefined : "No other columns are shown"
                }
                label={"Hide other columns"}
                checked={hideOthers}
                onChange={setHideOthers}
              />
            )}
          </FlexCol>
        </Popup>
      )}
    </>
  );
};
