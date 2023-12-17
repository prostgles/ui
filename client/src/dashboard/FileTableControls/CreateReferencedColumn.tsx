import { mdiPlus } from "@mdi/js";
import { asName } from "prostgles-types";
import React, { useState } from "react";
import { DBSSchema } from "../../../../commonTypes/publishUtils";
import { PrglCore } from "../../App";
import { FlexCol } from "../../components/Flex";
import { FormFieldDebounced } from "../../components/FormField/FormFieldDebounced";
import { InfoRow } from "../../components/InfoRow";
import Popup from "../../components/Popup/Popup";
import Select from "../../components/Select/Select";
import { SwitchToggle } from "../../components/SwitchToggle";

type CreateReferencedColumnProps = Omit<PrglCore, "methods"> & {
  file_table_config?: DBSSchema["database_configs"]["file_table_config"];
}

const linkTypes = [
  { key: "one", label: "One" },
  { key: "many", label: "Many" },
] as const;

export const CreateReferencedColumn = ({ db, tables, file_table_config }: CreateReferencedColumnProps) => {
  const tc = file_table_config;

  const [tableName, setTableName] = useState<string>();
  const [colName, setColName] = useState<string>();
  const [optional, setOptional] = useState(true);
  const [linkType, setLinkType] = useState<typeof linkTypes[number]["key"]>("one");
  
  if(!tc?.fileTable) return null;
  const pkey = tables.find(t => t.name === tableName)?.columns.find(c => c.is_pkey);
  const query = !tableName? "" : 
    linkType === "one"? 
    [
      `ALTER TABLE ${asName(tableName || "empty")} `,
      `ADD COLUMN ${asName(colName || "empty")} UUID ${!optional ? " NOT NULL " : ""} REFERENCES ${asName(tc.fileTable)} (id)`
    ].join("\n") : 
    [
      `CREATE TABLE ${asName(`${tableName}_files`)} (`,
      `  file_id UUID NOT NULL REFERENCES ${asName(tc.fileTable)},`,
      `  foreign_id ${pkey?.udt_name ?? "text"} NOT NULL REFERENCES ${asName(tableName)}`,
      `)`,
    ].join("\n")
  
  return <>
    <FlexCol>
      <Select 
        value={tableName} 
        className="mt-1"
        btnProps={{
          children: "Add new link",
          color: "action",
          iconPath: mdiPlus,
          
        }}
        fullOptions={tables.filter(t => !t.info.isFileTable).map(t => ({
          key: t.name,
          disabledInfo: t.columns.some(c => c.is_pkey)? undefined : "Needs a primary key"
        }))} 
        onChange={table => setTableName(table)} 
      />
      {tableName &&
        <Popup 
          title="Add new file link"
          positioning="center"
          onClose={() => setTableName(undefined)}
          contentClassName="gap-1 p-1"
          footerButtons={[
            { label: "Cancel", onClickClose: true },
            { 
              label: "Create", 
              variant: "filled", 
              color: "action", 
              disabledInfo: !colName? "New column name missing" : undefined,
              onClickMessage: async (_, setM) => {
                try {
                  setM({ loading: 1 })
                  if (!db.sql) throw "Not enough privileges. Must be allowed to run SQL queries";
                  await db.sql?.(query);
                  setM({ ok: "Created!" }, () => setTableName(undefined))
                } catch (err) {
                  setM({ err })
                }
              }
            },
          ]}
        >
          {/* <ButtonGroup 
            label={"Link type"}
            fullOptions={linkTypes}
            value={linkType}
            onChange={linkType => {
              setLinkType(linkType)
            }} 
          /> */}
          {linkType === "one" && <> 
            <FormFieldDebounced 
              label="New column name" 
              value={colName} 
              type="text" 
              onChange={col => setColName(col)} 
            />
            <SwitchToggle 
              label="Optional" 
              onChange={e => setOptional(e)} 
              checked={!!optional} 
            />
          </>}
          <InfoRow iconPath="">{query}</InfoRow>
          </Popup>
        }
    </FlexCol>
  </>
}