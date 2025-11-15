import { mdiFileUploadOutline, mdiFunction, mdiPlus, mdiTable } from "@mdi/js";
import React, { useState } from "react";
import type { FullOption } from "@components/Select/Select";
import { Select } from "@components/Select/Select";
import { FileImporter } from "../FileImporter/FileImporter";
import { NewMethod } from "../W_Method/NewMethod";
import { CreateTable } from "./CreateTable";
import type { DashboardMenuProps } from "./DashboardMenu";

const items = [
  { key: "new table", label: "Create table", iconPath: mdiTable },
  {
    key: "import file",
    label: "Import file",
    subLabel: "Supported types: csv/geojson/json",
    iconPath: mdiFileUploadOutline,
  },
  {
    key: "new function",
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
        title="Create/Import"
        data-command="dashboard.menu.create"
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
      {show === "new table" && (
        <CreateTable
          {...p}
          onClose={() => {
            setShow(undefined);
          }}
        />
      )}
      {show === "import file" && (
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
      {show === "new function" && (
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
