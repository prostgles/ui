import {
  mdiCube,
  mdiFileUploadOutline,
  mdiFunction,
  mdiPlus,
  mdiTable,
} from "@mdi/js";
import React, { useState } from "react";
import type { FullOption } from "@components/Select/Select";
import { Select } from "@components/Select/Select";
import { FileImporter } from "../FileImporter/FileImporter";
import { NewMethod } from "../W_Method/NewMethod";
import { CreateTable } from "./CreateTable";
import type { DashboardMenuProps } from "./DashboardMenu";
import { useAddViewToWorkspace } from "../Dashboard/useAddViewToWorkspace";
import { useAlert } from "@components/AlertProvider";

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
  {
    key: "agentic workflow",
    label: "Create Agentic Workflow",
    iconPath: mdiCube,
  },
] as const satisfies FullOption[];

export const NewTableMenu = (
  p: DashboardMenuProps & { onClose: VoidFunction | undefined },
) => {
  const { prgl, tables, onClose, workspace } = p;
  const { sql } = prgl;
  const [show, setShow] = useState<(typeof items)[number]["key"]>();
  const { addViewToWorkspace } = useAddViewToWorkspace();
  const { addAlert } = useAlert();
  // if (!sql) return null;

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
          size: "default",
          className: "",
          children: null,
          style: {
            visibility: !sql ? "hidden" : undefined,
          },
        }}
        fullOptions={items}
        onChange={(o) => {
          if (o === "agentic workflow") {
            addAlert({
              children: (
                <>
                  Agentic workflows are created through the{" "}
                  <strong>Create workflow</strong> prompt in the AI Assistant
                  chat.
                </>
              ),
            });
          } else {
            setShow(o);
          }
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
