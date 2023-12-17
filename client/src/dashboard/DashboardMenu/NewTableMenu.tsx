import { mdiPlus } from "@mdi/js";
import React, { useState } from "react";
import Select from "../../components/Select/Select";
import FileImporter from "../FileImporter/FileImporter";
import { CreateTable } from "./CreateTable";
import { DashboardMenuProps } from "./DashboardMenu";

const items = [
  { key: "New", label: "Create table" },
  // { key: "SampleSchemas", label: "Create demo tables" },
  { key: "Import file", label: "Import file", subLabel: "Supported types: csv/geojson/json" },
] as const;

export const NewTableMenu = (p: DashboardMenuProps) => {
  const  { prgl, tables, loadTable } = p;
  const sql = prgl.db.sql;

  
  const [show, setShow] = useState<typeof items[number]["key"]>();
  
  if(!sql) return null;

  // <Btn iconPath={mdiPlus}
  //   className={" fit " }
  //   // style={{ marginLeft: "6px", marginTop: "2em"}}
  //   title="Import data from file"
  //   data-command="import-data"
  //   variant="outline"
  //   onClick={() => {
  //     setshowImportFile(true);
  //     // pClose();
  //   }}
  // >Import data</Btn>
 
  
  return <><Select 
    emptyLabel="Create table"
    data-command="dashboard.menu.createTable"
    iconPath=""
    btnProps={{
      iconPath: mdiPlus,
      iconPosition: "left",
      iconClassname: "",
      color: "action",
      variant: "filled",
      className: "",
      children: null
    }}
    fullOptions={items}
    onChange={o => {
      setShow(o);
    }} 
  />
  {show === "New" && <CreateTable { ...p } onClose={() => { setShow(undefined); }}  />}
  {show === "Import file" && <FileImporter
      tables={tables}
      db={prgl.db}
      onClose={() => {  
        setShow(undefined);
      }} 
      openTable={table => {
        loadTable({ type: "table", table });
      }}
    />
  }
  {/* {show === "SampleSchemas" && 
    <SampleSchemas 
      title="Sample schemas" 
      dbsMethods={prgl.dbsMethods}
      onChange={(schema) => {
        loadTable({ type: "sql", name: schema.name, sql: schema.sql });
        setShow(undefined);
      }} 
    />
  } */}
  </>
}