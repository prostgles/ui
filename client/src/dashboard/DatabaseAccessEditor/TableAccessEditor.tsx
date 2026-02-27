import Btn from "@components/Btn";
import { FlexRow, FlexRowWrap } from "@components/Flex";
import React from "react";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import type { DatabaseAccessPermission } from "./DatabaseAccessEditor";
import { TableAccessAdvancedOptions } from "./TableAccessAdvancedOptions";
import { TableAccessAdvancedOptionsMenu } from "./TableAccessAdvancedOptionsMenu";
import type { ViewMode } from "./ViewModeToggle";
import { mdiPlus, mdiTablePlus } from "@mdi/js";

export type TableAccessPermissions = Extract<
  DatabaseAccessPermission,
  { mode: "custom" }
>["tablePermissions"][string];

export const TABLE_RULE_TYPES = [
  "select",
  "insert",
  "update",
  "delete",
] as const;

export type TableRuleType = (typeof TABLE_RULE_TYPES)[number];

export const TableAccessEditor = ({
  value,
  onChange,
  table,
  viewMode,
}: {
  value: TableAccessPermissions;
  table: DBSchemaTableWJoins;
  onChange: undefined | ((newTableRules: TableAccessPermissions) => void);
  viewMode: ViewMode;
}) => {
  // if (viewMode !== "Overview") {
  //   return (
  //     <FlexRowWrap>
  //       <TableAccessAdvancedOptions
  //         table={table}
  //         onChange={onChange}
  //         ruleType={viewMode}
  //         tableRules={value}
  //       />
  //     </FlexRowWrap>
  //   );
  // }

  return (
    <FlexRow className="gap-0">
      <Btn
        variant="faded"
        color="action"
        size="small"
        className="mr-1"
        title="New table to be created"
        style={{
          visibility: table.info.oid === -1 ? "visible" : "hidden",
        }}
        iconPath={mdiTablePlus}
      />
      {TABLE_RULE_TYPES.map((ruleType) => {
        const ruleValue = value[ruleType];
        return (
          <React.Fragment key={ruleType}>
            <Btn
              key={ruleType}
              title={ruleType.toUpperCase()}
              color={ruleValue ? "action" : "default"}
              variant={
                ruleValue ?
                  !onChange ?
                    "faded"
                  : "filled"
                : undefined
              }
              size={"small"}
              disabledInfo={onChange ? undefined : "Cannot edit"}
              disabledVariant="no-fade"
              onClick={() => {
                const shouldTurnOn = !ruleValue;
                void onChange?.({
                  ...value,
                  [ruleType]: shouldTurnOn || undefined,
                });
              }}
            >
              {(window.isMobile ?
                ruleType.slice(0, 1)
              : ruleType
              ).toUpperCase()}
            </Btn>

            <TableAccessAdvancedOptionsMenu
              table={table}
              tableRules={value}
              ruleType={ruleType}
              className="mr-p25"
              onChange={(newTableRules) => {
                void onChange?.(newTableRules);
              }}
            />
          </React.Fragment>
        );
      })}
    </FlexRow>
  );
};
