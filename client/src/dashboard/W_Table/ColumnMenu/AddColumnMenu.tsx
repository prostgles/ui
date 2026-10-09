import Popup, { POPUP_CLASSES } from "@components/Popup/Popup";
import type { FullOption } from "@components/Select/Select";
import { Select } from "@components/Select/Select";
import {
  mdiFunction,
  mdiLink,
  mdiTableColumnPlusAfter,
  mdiTableEdit,
} from "@mdi/js";
import type { SQLHandler } from "prostgles-client";
import React, { useMemo, useState } from "react";
import type { Prgl } from "src/App";
import { t } from "../../../i18n/i18nUtils";
import type {
  DBSchemaTablesWJoins,
  LoadedSuggestions,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";
import { CreateFileColumn } from "../../FileTableControls/CreateFileColumn";
import { updateWCols } from "../tableUtils/tableUtils";
import { QuickAddComputedColumn } from "./AddComputedColumn/QuickAddComputedColumn";
import { CreateColumn } from "./AlterColumn/CreateColumn";
import { LinkedColumn } from "./LinkedColumn/LinkedColumn";
import type { NestedColumnOpts } from "./getNestedColumnTable";
import Btn from "@components/Btn";
import { generateUniqueID } from "@components/FileInput/FileInput";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import {
  ActionColumnsControls,
  type ActionColumnsFormat,
} from "./ColumnDisplayFormat/ActionColumnsControls";
import { getActionFunctions } from "./ColumnDisplayFormat/getActionFunctions";

const options = [
  {
    key: "Action",
    label: "Add action column",
    subLabel: "Group stored actions and functions for this row",
    iconPath: mdiFunction,
  },
  {
    key: "Computed",
    label: t.AddColumnMenu["Add Computed Field"],
    subLabel: t.AddColumnMenu["Show a computed column"],
    iconPath: mdiFunction,
  },
  {
    key: "Referenced",
    label: t.AddColumnMenu["Add Linked Data"],
    subLabel: t.AddColumnMenu["Show data from a related table"],
    iconPath: mdiLink,
  },
  {
    key: "Create",
    label: t.AddColumnMenu["Create New Column"],
    subLabel: t.AddColumnMenu["Create a new column in this table"],
    disabledInfo: undefined,
    iconPath: mdiTableEdit,
  },
  {
    key: "CreateFileColumn",
    label: t.AddColumnMenu["Create New File Column"],
    subLabel: t.AddColumnMenu["Create a new file column in this table"],
    disabledInfo: undefined,
    iconPath: mdiTableEdit,
  },
] as const satisfies readonly FullOption[];

export type AddColumnMenuProps = {
  w: WindowSyncItem<"table">;
  tables: DBSchemaTablesWJoins;
  db: Prgl["db"];
  sql: SQLHandler | undefined;
  suggestions: LoadedSuggestions | undefined;
  variant?: "detailed";
  nestedColumnOpts: NestedColumnOpts | undefined;
};

export const AddColumnMenu = ({
  w,
  tables,
  variant,
  nestedColumnOpts,
  suggestions,
  sql,
}: AddColumnMenuProps) => {
  const { methods } = usePrgl();
  const table = tables.find((t) => t.name === w.table_name);
  const actions = table ? getActionFunctions(methods, table) : [];
  const storedActions = table?.columns.filter((c) => c.select &&
    c.defaultRenderAs?.params.component === "ActionColumns") ?? [];
  const [actionFormat, setActionFormat] = useState<ActionColumnsFormat>();
  const [colType, setColType] = useState<
    (typeof options)[number]["key"] | void
  >();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | void>();

  /**
   * Root query aggregation AND nested joins not allowed
   */
  const wCols = w.columns;
  const dissallow = useMemo(() => {
    return (
      (
        wCols?.some(
          (c) =>
            c.computedConfig?.funcDef.isAggregate ||
            c.computedConfig?.funcDef.key.startsWith("$count"),
        )
      ) ?
        "Referenced"
      : wCols?.some((c) => c.nested) ? "aggs"
      : undefined
    );
  }, [wCols]);

  if (!table) {
    return <>Table {w.table_name} not found</>;
  }

  const cannotCreateColumns =
    !sql ? t.AddColumnMenu["Not enough privileges"]
    : table.isView ?
      t.AddColumnMenu["This is a view. Cannot create columns, must recreate"]
    : undefined;
  const onClose = () => setColType();

  return (
    <>
      <Select
        data-command="AddColumnMenu"
        onOpen={setAnchorEl}
        btnProps={{
          children: variant ? t.AddColumnMenu["New Field"] : "",
          variant: variant ? "faded" : undefined,
          color: variant ? "action" : undefined,
          iconPath: mdiTableColumnPlusAfter,
          size: variant ? undefined : "small",
          title: t.AddColumnMenu["Add column"],
        }}
        fullOptions={options.map((o) => ({
          ...o,
          disabledInfo:
            o.key === "Action" && !actions.length && !storedActions.length ?
              "No functions have a RowLookup or ValueLookup for this table"
            : o.key === "Action" && nestedColumnOpts ?
              "Not allowed for nested columns"
            : o.key === "Action" && dissallow === "Referenced" ?
              "Actions require individual rows, not aggregates"
            : !table.joinsV2.length && o.key === "Referenced" ?
              t.AddColumnMenu["No foreign keys to/from this table"]
            : nestedColumnOpts && o.key === "Referenced" ?
              t.AddColumnMenu["Not allowed for nested columns"]
            : o.key === "Create" ? cannotCreateColumns
            : o.key === dissallow ?
              t.AddColumnMenu[
                "Aggregates and/or Count not allowed with linked "
              ]
            : o.key === "CreateFileColumn" && table.isFileTable ?
              "Cannot add file column to a file table"
            : undefined,
        }))}
        onChange={(type) => {
          const action = actions[0];
          if (type === "Action") {
            setActionFormat({
              type: "ActionColumns",
              params: { actions: action ? [{
                ...action,
                conditions: [],
                defaultValue: { text: action.methodName },
              }] : storedActions.map((c) => ({ columnName: c.name })) },
            });
          }
          setColType(type);
        }}
      />
      {!colType || !anchorEl ?
        null
      : colType === "CreateFileColumn" ?
        <CreateFileColumn
          fileTable={tables[0]?.fileTableName}
          tableName={table.name}
          onClose={() => setColType(undefined)}
        />
      : <Popup
          title={
            colType === "Action" ? "Add action column"
            : colType === "Computed" ? t.AddColumnMenu[`Add Computed Field`]
            : colType === "Create" ?
              t.AddColumnMenu[`Create new column`]
            : t.AddColumnMenu["Add Referenced/Linked Fields"]
          }
          positioning="beneath-left"
          anchorEl={anchorEl}
          onClose={onClose}
          autoFocusFirst={{ selector: `.${POPUP_CLASSES.content} input` }}
          clickCatchStyle={{ opacity: 0.5 }}
          contentClassName="p-1"
        >
          {colType === "Action" && actionFormat ?
            <div className="flex-col gap-1">
              <ActionColumnsControls
                table={table}
                value={actionFormat}
                onChange={setActionFormat}
              />
              <Btn
                variant="filled"
                disabledInfo={!actionFormat.params.actions.length ? "Add at least one action" : undefined}
                color="action"
                onClickPromise={async () => {
                  const [firstAction] = actionFormat.params.actions;
                  await updateWCols(w, [{
                    name: generateUniqueID("action_"),
                    label: actionFormat.params.actions.length === 1 && firstAction && "methodName" in firstAction ?
                      firstAction.defaultValue?.text || firstAction.methodName : "Actions",
                    show: true,
                    format: actionFormat,
                  }, ...(w.columns ?? [])]);
                  onClose();
                }}
              >
                Add action column
              </Btn>
            </div>
          : colType === "Computed" ?
            <QuickAddComputedColumn
              existingColumn={undefined}
              tableName={table.name}
              onAddColumn={(computedColumn) => {
                if (!computedColumn) {
                  setAnchorEl(undefined);
                  return;
                }
                updateWCols(
                  w,
                  [computedColumn, ...(w.columns ?? [])],
                  undefined,
                );
                setAnchorEl(undefined);
              }}
            />
          : colType === "Create" ?
            <CreateColumn
              sql={sql!}
              field=""
              table={table}
              tables={tables}
              suggestions={suggestions}
              onClose={onClose}
            />
          : <LinkedColumn column={undefined} onClose={onClose} w={w} />}
        </Popup>
      }
    </>
  );
};
