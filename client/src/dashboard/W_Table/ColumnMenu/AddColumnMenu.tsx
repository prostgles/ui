import {
  mdiFunction,
  mdiLink,
  mdiTableColumnPlusAfter,
  mdiTableEdit,
} from "@mdi/js";
import {
  useMemoDeep,
  type DBHandlerClient,
} from "prostgles-client/dist/prostgles";
import React, { useState } from "react";
import { WithPrgl } from "../../../WithPrgl";
import Popup, { POPUP_CLASSES } from "../../../components/Popup/Popup";
import type { FullOption } from "../../../components/Select/Select";
import Select from "../../../components/Select/Select";
import type {
  DBSchemaTablesWJoins,
  LoadedSuggestions,
  WindowSyncItem,
} from "../../Dashboard/dashboardUtils";
import { CreateFileColumn } from "../../FileTableControls/CreateFileColumn";
import { AddComputedColMenu } from "./AddComputedColumn/AddComputedColMenu";
import { CreateColumn } from "./AlterColumn/CreateColumn";
import { LinkedColumn } from "./LinkedColumn/LinkedColumn";
import type { NestedColumnOpts } from "./getNestedColumnTable";
import { t } from "../../../i18n/i18nUtils";

const options = [
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
  db: DBHandlerClient;
  suggestions: LoadedSuggestions | undefined;
  variant?: "detailed";
  nestedColumnOpts: NestedColumnOpts | undefined;
};

export const AddColumnMenu = ({
  w,
  tables,
  db,
  variant,
  nestedColumnOpts,
  suggestions,
}: AddColumnMenuProps) => {
  const table = tables.find((t) => t.name === w.table_name);
  const [colType, setColType] = useState<
    (typeof options)[number]["key"] | void
  >();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | void>();

  /**
   * Root query aggregation AND nested joins not allowed
   */
  const wCols = w.columns;
  const dissallow = useMemoDeep(() => {
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
    !db.sql ? t.AddColumnMenu["Not enough privileges"]
    : table.info.isView ?
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
            !table.joinsV2.length && o.key === "Referenced" ?
              t.AddColumnMenu["No foreign keys to/from this table"]
            : nestedColumnOpts && o.key === "Referenced" ?
              t.AddColumnMenu["Not allowed for nested columns"]
            : o.key === "Create" ? cannotCreateColumns
            : o.key === dissallow ?
              t.AddColumnMenu[
                "Aggregates and/or Count not allowed with linked "
              ]
            : undefined,
        }))}
        onChange={(type) => setColType(type)}
      />
      {!colType || !anchorEl ?
        null
      : colType === "Computed" ?
        <AddComputedColMenu
          db={db}
          w={w}
          tables={tables}
          onClose={onClose}
          nestedColumnOpts={nestedColumnOpts}
        />
      : colType === "CreateFileColumn" ?
        <WithPrgl
          onRender={(prgl) => (
            <CreateFileColumn
              db={db}
              tables={tables}
              fileTable={tables[0]?.info.fileTableName}
              tableName={table.name}
              prgl={prgl}
              onClose={() => setColType(undefined)}
            />
          )}
        />
      : <Popup
          title={
            colType === "Create" ?
              t.AddColumnMenu[`Create new column`]
            : t.AddColumnMenu["Add Referenced/Linked Fields"]
          }
          positioning="beneath-left"
          anchorEl={anchorEl}
          onClose={onClose}
          autoFocusFirst={{ selector: `.${POPUP_CLASSES.content} input` }}
          clickCatchStyle={{ opacity: 0.5 }}
        >
          {colType === "Create" ?
            <CreateColumn
              db={db}
              field=""
              table={table}
              tables={tables}
              suggestions={suggestions}
              onClose={onClose}
            />
          : <LinkedColumn
              db={db}
              column={undefined}
              onClose={onClose}
              tables={tables}
              w={w}
            />
          }
        </Popup>
      }
    </>
  );
};
