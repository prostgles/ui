import { mdiFunction, mdiLink, mdiPlus, mdiTableColumnPlusAfter, mdiTableEdit } from "@mdi/js"
import { DBHandlerClient } from "prostgles-client/dist/prostgles"
import React, { useState } from "react"
import Popup, { POPUP_CONTENT_CLASS } from "../../../components/Popup/Popup"
import Select, { FullOption } from "../../../components/Select/Select"
import { DBSchemaTablesWJoins, LoadedSuggestions, WindowSyncItem } from "../../Dashboard/dashboardUtils"
import { AddComputedColMenu } from "./AddComputedColMenu"
import { CreateColumn } from "./AlterColumn/CreateColumn"
import { LinkedColumn } from "./LinkedColumn/LinkedColumn"
import { Theme, themeR } from "../../../App"
import { useReactiveState } from "../../ProstglesMethod/hooks"

const options = [
  { 
    key: "Create", 
    label: "Create New Column", 
    subLabel: "Create a new column in this table", disabledInfo: undefined, 
    iconPath: mdiTableEdit, 
  },
  { 
    key: "Computed", 
    label: "Add Computed Field", 
    subLabel: "Show a computed column",
    iconPath: mdiFunction,
  },
  { 
    key: "Referenced", 
    label: "Add Linked Data", 
    subLabel: "Show data from a related table",
    iconPath: mdiLink,
  },
] as const satisfies readonly FullOption[];

export type AddColumnMenuProps = {
  w: WindowSyncItem<"table">;
  tables: DBSchemaTablesWJoins;
  db: DBHandlerClient;
  suggestions: LoadedSuggestions | undefined;
  variant?: "detailed";
  nestedColumnName: string | undefined;
};

export const AddColumnMenu = ({ w, tables, db, variant, nestedColumnName, suggestions }: AddColumnMenuProps) => {
  const table = tables.find(t => t.name === w.table_name);
  const [colType, setColType] = useState<typeof options[number]["key"] | void>();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | void>();
  const { state: theme } = useReactiveState(themeR);
  if(!table){
    return <>Table {w.table_name} not found</>
  }

  const cannotCreateColumns = !db.sql? "Not enough privileges" : table.info.isView? "This is a view. Cannot create columns, must recreate" : undefined;
  const onClose = () => setColType();
  return <>
    <Select
      data-command="AddColumnMenu"
      onOpen={setAnchorEl}
      btnProps={{
        children: variant? "New Field" : "",
        variant: variant? "faded" : undefined,
        color: variant? "action" : undefined,
        iconPath: mdiTableColumnPlusAfter,
        size: variant? undefined : "small",
        title: "Add column"
      }}
      fullOptions={options.map(o => ({
        ...o,
        disabledInfo: !table.joinsV2.length && o.key === "Referenced"? "No foreign keys to/from this table" : 
          nestedColumnName && o.key === "Referenced"? "Not allowed for nested columns" : o.key !== "Create"? undefined : 
          cannotCreateColumns
      }))}
      onChange={(type) => setColType(type)}
    />
    {(!colType || !anchorEl)? null : colType === "Computed"? 
      <AddComputedColMenu 
        db={db} 
        w={w} 
        tables={tables} 
        onClose={onClose} 
        nestedColumnName={nestedColumnName} 
      /> : 
      <Popup 
        title={colType === "Create"?  `Create New Column` : "Add Referenced/Linked Fields"}
        positioning="beneath-left"
        anchorEl={anchorEl}
        onClose={onClose}
        autoFocusFirst={{ selector: `.${POPUP_CONTENT_CLASS} button` }}
        clickCatchStyle={{ opacity: .5 }}
      >
        {colType === "Create"? 
          <CreateColumn db={db} field="" table={table} tables={tables} suggestions={suggestions} onClose={onClose} /> : 
          <LinkedColumn db={db} column={undefined} onClose={onClose} tables={tables} w={w} />
        }
      </Popup>
    }
  </>;
}