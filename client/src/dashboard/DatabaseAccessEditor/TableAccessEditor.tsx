import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import PopupMenu from "@components/PopupMenu";
import { SearchList } from "@components/SearchList/SearchList";
import { mdiTablePlus } from "@mdi/js";
import React from "react";
import type { DBSchemaTableWJoins } from "../Dashboard/dashboardUtils";
import { getColumnListItem } from "../W_Table/ColumnMenu/ColumnSelect/getColumnListItem";
import type { DatabaseAccessPermission } from "./DatabaseAccessEditor";
import { TableAccessAdvancedOptionsMenu } from "./TableAccessAdvancedOptionsMenu";

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
}: {
  value: TableAccessPermissions;
  table: DBSchemaTableWJoins & { isNewTable?: boolean };
  onChange: undefined | ((newTableRules: TableAccessPermissions) => void);
}) => {
  const { isNewTable, columns } = table;
  return (
    <FlexRow className="gap-0">
      <PopupMenu
        button={
          <Btn
            variant="faded"
            color={isNewTable ? "action" : undefined}
            size="small"
            className="mr-1"
            title="New table to be created"
            style={{
              visibility: isNewTable ? "visible" : "hidden",
            }}
            iconPath={mdiTablePlus}
          />
        }
      >
        <SearchList items={columns.map((c) => getColumnListItem(c))} />
      </PopupMenu>
      {TABLE_RULE_TYPES.map((ruleType) => {
        const ruleValue = value[ruleType];
        return (
          <React.Fragment key={ruleType}>
            <Btn
              key={ruleType}
              title={ruleType.toUpperCase()}
              color={
                ruleValue ?
                  ruleType === "select" ?
                    "action"
                  : ruleType === "update" ?
                    "warn"
                  : ruleType === "delete" ?
                    "danger"
                  : "green"
                : "default"
              }
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
