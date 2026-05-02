import { fixIndent } from "@common/utils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import {
  MONACO_READONLY_DEFAULT_OPTIONS,
  MonacoEditor,
} from "@components/MonacoEditor/MonacoEditor";
import PopupMenu from "@components/PopupMenu";
import { mdiDatabasePlus, mdiDelta } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import type { DatabaseAccessPermission } from "./DatabaseAccessEditor";
import { TableAccessAdvancedOptionsMenu } from "./TableAccessAdvancedOptionsMenu";
import type { TableSchemaWithDriftState } from "./useDatabaseAccessEditorTables";

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
  table: TableSchemaWithDriftState;
  onChange: undefined | ((newTableRules: TableAccessPermissions) => void);
}) => {
  const { sql, db } = usePrgl();
  const { ddlState } = table;
  return (
    <FlexRow className="gap-0">
      <PopupMenu
        title={"Table created in this workflow"}
        onClickClose={false}
        showFullscreenToggle={{}}
        clickCatchStyle={{ opacity: 1 }}
        data-command={!ddlState ? undefined : "TableAccessEditor.newTableDDL"}
        button={
          <Btn
            variant="faded"
            color={
              ddlState?.state === "new" ? "action"
              : ddlState?.state === "drifted" ?
                "warn"
              : undefined
            }
            size="small"
            className="mr-1"
            title={"Table created in this workflow"}
            style={{
              visibility: ddlState ? "visible" : "hidden",
            }}
            iconPath={
              ddlState?.state === "drifted" ? mdiDelta : mdiDatabasePlus
            }
          />
        }
        footerButtons={[
          {
            label: "Close",
            onClickClose: true,
            className: "mr-auto",
          },
          ddlState?.state === "matches" ?
            {
              label: "Delete all data",
              color: "danger",
              variant: "faded",
              clickConfirmation: {
                buttonText: "Delete",
                message: (
                  <span>
                    Are you sure you want to delete all data from{" "}
                    <strong>{table.name}</strong>?
                  </span>
                ),
                color: "danger",
              },
              onClickPromise: async () => {
                const tableHandle = db[table.name];
                if (!tableHandle) {
                  throw new Error("Table handle missing or table not allowed");
                }
                if (!tableHandle.delete) {
                  throw new Error("Table delete operation not allowed");
                }

                const deletedRows = await tableHandle.delete(
                  {},
                  { returning: { ctid: 1 } },
                );
                throw new Error(
                  `Deleted ${deletedRows?.length ?? 0} rows from ${table.name}`,
                );
              },
            }
          : ddlState?.state === "drifted" ?
            {
              label: "Apply patch",
              color: "warn",
              variant: "filled",
              clickConfirmation: {
                buttonText: "Apply",
                message:
                  "Applying the patch will update the live table schema to match this workflow's definition. This may cause data loss if columns are being removed or changed. Are you sure you want to apply the patch?",
                color: "danger",
              },
              disabledInfo: !sql ? "SQL client not available" : undefined,
              onClickPromise: async () => {
                if (!sql) {
                  throw new Error("SQL client not available");
                }

                await sql(ddlState.patchDdl);
              },
            }
          : undefined,
        ]}
      >
        {ddlState && (
          <FlexCol>
            <p className="ta-start">
              {
                {
                  new: "This table does not exist in the database yet. It will be created with the DDL below.",
                  drifted:
                    "The live table schema differs from this workflow's definition. Apply the patch below to bring it in sync.",
                  matches:
                    "The live table schema matches this workflow's definition.",
                }[ddlState.state]
              }
            </p>
            <MonacoEditor
              className="b b-color-0 f-1"
              language={"sql"}
              loadedSuggestions={undefined}
              value={fixIndent(ddlState.patchDdl ?? ddlState.ddl)}
              options={MONACO_READONLY_DEFAULT_OPTIONS}
            />
          </FlexCol>
        )}
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
