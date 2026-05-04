import Btn from "@components/Btn";
import { FlexRow } from "@components/Flex";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { Select } from "@components/Select/Select";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useState } from "react";
import { SchemaFilter } from "../../pages/NewConnection/SchemaFilter";
import { getCssVariableValue } from "../Charts/TimeChart/getCssVariableValue";
import type { CASCADE } from "../SQLEditor/SQLCompletion/getPGObjects";
import {
  type ColumnColorMode,
  type ColumnDisplayMode,
} from "./ERDSchema/ERDSchema";

export const SchemaGraphControls = ({
  columnColorMode,
  columnDisplayMode,
  displayMode,
  setColumnColorMode,
  setColumnDisplayMode,
  setDisplayMode,
  setSchemaKey,
  schemaKey,
  selectedTables,
  setSelectedTables,
}: ReturnType<typeof useSchemaGraphControls>) => {
  const { connectionId, dbs, sql, connection, tables } = usePrgl();
  const { db_schema_filter } = connection;
  return (
    <FlexRow
      className="w-full ai-start"
      key={schemaKey}
      data-command="SchemaGraph.TopControls"
    >
      <ScrollFade
        className="flex-row-wrap gap-1 ox-auto font-16   f-1 relative s-fit no-scroll-bar"
        style={{ fontWeight: "normal" }}
      >
        <SchemaFilter
          sql={sql}
          db_schema_filter={db_schema_filter}
          asSelect={{
            btnProps: {
              size: "small",
            },
            asRow: true,
          }}
          onChange={(newDbSchemaFilter) => {
            void dbs.connections.update(
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
        {displayMode === "custom" && (
          <Select
            data-command="SchemaGraph.TopControls.tableFilter"
            value={Array.from(selectedTables ?? [])}
            label="Selected tables"
            asRow={true}
            size="small"
            multiSelect={true}
            fullOptions={tables.map((t) => ({ key: t.name }))}
            onChange={(val) => setSelectedTables(new Set(val))}
          />
        )}
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
          color="warn"
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
      </ScrollFade>
    </FlexRow>
  );
};

export const useSchemaGraphControls = () => {
  const [displayMode, setDisplayMode] = useState<SchemaGraphDisplayMode>("all");
  const [selectedTables, setSelectedTables] = useState<Set<string>>();
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
    selectedTables,
    setSelectedTables,
  };
};

export const getSchemaTableColY = (i, height) => {
  return (!i ? 8 : 16) + i * 20 - height / 2;
};

const DISPLAY_MODES = [
  { key: "all", label: "all" },
  { key: "relations", label: "linked" },
  { key: "leaf", label: "orphaned" },
  { key: "custom", label: "custom" },
] as const;

const COLUMN_COLOR_MODES = [
  { key: "schema", label: "By schema", subLabel: "Color by schema" },
  {
    key: "default",
    label: "Single color",
    subLabel: "Use one color for all links",
  },
  {
    key: "root",
    label: "By source table",
    subLabel: "Color links by source table",
  },
  {
    key: "on-delete",
    label: "By ON DELETE",
    subLabel: "Color links by ON DELETE rule",
  },
  {
    key: "on-update",
    label: "By ON UPDATE",
    subLabel: "Color links by ON UPDATE rule",
  },
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
