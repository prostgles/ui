import React, { useState } from "react";
import { getEntries } from "../../../../commonTypes/utils";
import Btn from "../../components/Btn";
import Chip from "../../components/Chip";
import { FlexRow, FlexRowWrap } from "../../components/Flex";
import Select from "../../components/Select/Select";
import { getCssVariableValue } from "../Charts/onRenderTimechart";
import {
  type ColumnColorMode,
  type ColumnDisplayMode,
} from "./ERDSchema/ERDSchema";
import type { SchemaGraphProps } from "./SchemaGraph";
import type { CASCADE } from "../SQLEditor/SQLCompletion/getPGObjects";
import { SchemaFilter } from "../../pages/NewConnection/SchemaFilter";

export const SchemaGraphControls = ({
  columnColorMode,
  columnDisplayMode,
  displayMode,
  setColumnColorMode,
  connectionId,
  dbs,
  db,
  setColumnDisplayMode,
  setDisplayMode,
  setSchemaKey,
  schemaKey,
  db_schema_filter,
}: ReturnType<typeof useSchemaGraphControls> &
  Pick<
    SchemaGraphProps,
    "dbs" | "db" | "connectionId" | "db_schema_filter"
  >) => {
  return (
    <FlexRow
      className="w-full"
      key={schemaKey}
      data-command="SchemaGraph.TopControls"
    >
      <div className="f-0">Schema diagram</div>
      <FlexRowWrap
        className="font-16   f-1 relative s-fit"
        style={{ fontWeight: "normal" }}
      >
        <SchemaFilter
          db={db}
          db_schema_filter={db_schema_filter}
          asSelect={{
            btnProps: {
              size: "small",
            },
            asRow: true,
            className: "ml-auto",
          }}
          onChange={(newDbSchemaFilter) => {
            dbs.connections.update(
              {
                id: connectionId,
              },
              {
                db_schema_filter: newDbSchemaFilter,
              },
            );
          }}
        />
        <Select
          data-command="SchemaGraph.TopControls.tableRelationsFilter"
          value={displayMode}
          label="Tables"
          asRow={true}
          size="small"
          fullOptions={DISPLAY_MODES}
          onChange={setDisplayMode}
        />
        <Select
          data-command="SchemaGraph.TopControls.columnRelationsFilter"
          value={columnDisplayMode}
          label="Columns"
          asRow={true}
          size="small"
          fullOptions={COLUMN_FILTER}
          onChange={setColumnDisplayMode}
        />
        <Select
          data-command="SchemaGraph.TopControls.linkColorMode"
          value={columnColorMode}
          label="Color mode"
          asRow={true}
          size="small"
          fullOptions={COLUMN_COLOR_MODES}
          onChange={setColumnColorMode}
        />
        {["on-delete", "on-update"].includes(columnColorMode) && (
          <FlexRowWrap>
            {" "}
            {getEntries(CASCADE_LEGEND).map(([label, { color, title }]) => (
              <Chip key={label} style={{ color }} title={title}>
                {label}
              </Chip>
            ))}
          </FlexRowWrap>
        )}

        <Btn
          data-command="SchemaGraph.TopControls.resetLayout"
          clickConfirmation={{
            buttonText: "Reset",
            color: "danger",
            message: "Are you sure you want to reset the layout?",
          }}
          className="ml-auto"
          size="small"
          variant="faded"
          onClickPromise={async () => {
            await dbs.database_configs.update(
              {
                $existsJoined: {
                  connections: {
                    id: connectionId,
                  },
                },
              },
              {
                table_schema_positions: null,
                table_schema_transform: null,
              },
            );
            setSchemaKey((k) => k + 1);
          }}
        >
          Reset layout
        </Btn>
      </FlexRowWrap>
    </FlexRow>
  );
};

export const useSchemaGraphControls = () => {
  const [displayMode, setDisplayMode] = useState<SchemaGraphDisplayMode>("all");
  const [columnDisplayMode, setColumnDisplayMode] =
    useState<ColumnDisplayMode>("all");
  const [columnColorMode, setColumnColorMode] =
    useState<ColumnColorMode>("root");
  const [schemaKey, setSchemaKey] = useState<number>(0);

  return {
    displayMode,
    setDisplayMode,
    columnDisplayMode,
    setColumnDisplayMode,
    columnColorMode,
    setColumnColorMode,
    schemaKey,
    setSchemaKey,
  };
};

export const getSchemaTableColY = (i, height) => {
  return (!i ? 8 : 16) + i * 20 - height / 2;
};

const DISPLAY_MODES = [
  { key: "all", label: "all" },
  { key: "relations", label: "linked" },
  { key: "leaf", label: "orphaned" },
] as const;

const COLUMN_COLOR_MODES = [
  { key: "default", subLabel: "Fixed color for all links" },
  { key: "root", subLabel: "Links show root table color" },
  { key: "on-delete", subLabel: "Links show on delete action" },
  { key: "on-update", subLabel: "Links show on update action" },
] as const;

const COLUMN_FILTER = [
  { key: "all" },
  { key: "references" },
  { key: "none" },
] as const;

export const CASCADE_LEGEND = {
  CASCADE: {
    color: getCssVariableValue("--text-danger"),
    title:
      "Automatically deletes or updates related rows in the child table when a row in the parent table is deleted or updated",
  },
  RESTRICT: {
    color: getCssVariableValue("--b-warning"),
    title:
      "Prevents deletion or update of a parent row if there are dependent rows in the child table",
  },
  "NO ACTION": {
    color: getCssVariableValue("--b-warning"),
    title:
      "Similar to RESTRICT, but the check is deferred until the end of the transaction (this is the default)",
  },
  "SET NULL": {
    color: getCssVariableValue("--text-1"),
    title:
      "Sets the foreign key columns to NULL when the referenced row is deleted or updated",
  },
  "SET DEFAULT": {
    color: getCssVariableValue("--color-number"),
    title:
      "Sets the foreign key columns to their default values when the referenced row is deleted or updated",
  },
} as const satisfies Record<CASCADE, { color: string; title: string }>;

export type SchemaGraphDisplayMode = (typeof DISPLAY_MODES)[number]["key"];
