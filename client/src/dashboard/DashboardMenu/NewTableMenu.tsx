import { mdiFileUploadOutline, mdiPlus, mdiTable } from "@mdi/js";
import React, { useState } from "react";
import type { FullOption } from "@components/Select/Select";
import { Select } from "@components/Select/Select";
import { FileImporter } from "../FileImporter/FileImporter";
import { CreateTable } from "./CreateTable";
import type { DashboardMenuProps } from "./DashboardMenu";
import { useAddViewToWorkspace } from "../Dashboard/useAddViewToWorkspace";

const items = [
  { key: "new table", label: "Create table", iconPath: mdiTable },
  {
    key: "import file",
    label: "Import file",
    subLabel: "Supported types: csv/geojson/json",
    iconPath: mdiFileUploadOutline,
  },
] as const satisfies FullOption[];

export const NewTableMenu = (
  p: DashboardMenuProps & { onClose: VoidFunction | undefined },
) => {
  const { prgl, onClose, workspace } = p;
  const { tables, sql } = prgl;
  const [show, setShow] = useState<(typeof items)[number]["key"]>();
  const { addViewToWorkspace } = useAddViewToWorkspace();

  return (
    <>
      <Select
        title="Create/import table"
        data-command="dashboard.menu.create"
        iconPath=""
        btnProps={{
          iconPath: mdiPlus,
          iconPosition: "left",
          iconClassname: "",
          color: "action",
          variant: "text",
          size: "small",
          className: "",
          children: null,
          style: {
            visibility: !sql ? "hidden" : undefined,
          },
        }}
        fullOptions={items}
        onChange={setShow}
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
          sql={prgl.sql!}
          onClose={() => {
            setShow(undefined);
          }}
          openTable={(table) => {
            onClose?.();
            void addViewToWorkspace({
              workspace_id: workspace.id,
              type: "table",
              table,
            });
          }}
        />
      )}
    </>
  );
};
