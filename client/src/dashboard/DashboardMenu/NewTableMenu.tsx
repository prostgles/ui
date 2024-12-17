import {
  mdiFileUploadOutline,
  mdiFunction,
  mdiPlus,
  mdiTable,
  mdiUpload,
} from "@mdi/js";
import React, { useState } from "react";
import Select from "../../components/Select/Select";
import type { FullOption } from "../../components/Select/Select";
import FileImporter from "../FileImporter/FileImporter";
import { NewMethod } from "../W_Method/NewMethod";
import { CreateTable } from "./CreateTable";
import type { DashboardMenuProps } from "./DashboardMenu";

const items = [
  { key: "New", label: "Create table", iconPath: mdiTable },
  {
    key: "Import file",
    label: "Import file",
    subLabel: "Supported types: csv/geojson/json",
    iconPath: mdiFileUploadOutline,
  },
  {
    key: "newMethod",
    label: "Create TS Function",
    subLabel: "(Experimental)",
    iconPath: mdiFunction,
  },
] as const satisfies FullOption[];

export const NewTableMenu = (p: DashboardMenuProps) => {
  const { prgl, tables, loadTable } = p;
  const sql = prgl.db.sql;
  const [show, setShow] = useState<(typeof items)[number]["key"]>();

  if (!sql) return null;

  return (
    <>
      <Select
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
          children: null,
        }}
        fullOptions={items}
        onChange={(o) => {
          setShow(o);
        }}
      />
      {show === "New" && (
        <CreateTable
          {...p}
          onClose={() => {
            setShow(undefined);
          }}
        />
      )}
      {show === "Import file" && (
        <FileImporter
          tables={tables}
          db={prgl.db}
          onClose={() => {
            setShow(undefined);
          }}
          openTable={(table) => {
            loadTable({ type: "table", table });
          }}
        />
      )}
      {show === "newMethod" && (
        <NewMethod
          {...prgl}
          access_rule_id={undefined}
          onClose={() => setShow(undefined)}
          methodId={undefined}
        />
      )}
    </>
  );
};
