import { mdiRelationManyToMany } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow, FlexRowWrap } from "../../components/Flex";
import Popup from "../../components/Popup/Popup";
import Select from "../../components/Select/Select";
import type { DBSchemaTablesWJoins } from "../Dashboard/dashboardUtils";
import type { DBS } from "../Dashboard/DBS";
import {
  ERDSchema,
  type ColumnColorMode,
  type ColumnDisplayMode,
} from "./ERDSchema/ERDSchema";
import { getCssVariableValue } from "../Charts/onRenderTimechart";
import Chip from "../../components/Chip";
import { getEntries } from "../../../../commonTypes/utils";

export type SchemaGraphProps = Pick<Prgl, "connectionId"> & {
  db: DBHandlerClient;
  dbs: DBS;
  tables: DBSchemaTablesWJoins;
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
  CASCADE: getCssVariableValue("--text-danger"),
  RESTRICT: getCssVariableValue("--text-warning"),
  NOACTION: getCssVariableValue("--text-warning"),
  "SET NULL": getCssVariableValue("--text-1"),
  "SET DEFAULT": getCssVariableValue("--color-number"),
} as const;

export type SchemaGraphDisplayMode = (typeof DISPLAY_MODES)[number]["key"];

export const SchemaGraph = (props: SchemaGraphProps) => {
  const { tables, connectionId, dbs } = props;
  const [showSchemaDiagram, setShowSchemaDiagram] = useState(false);
  const [displayMode, setDisplayMode] = useState<SchemaGraphDisplayMode>("all");
  const [columnDisplayMode, setColumnDisplayMode] =
    useState<ColumnDisplayMode>("all");
  const [columnColorMode, setColumnColorMode] =
    useState<ColumnColorMode>("default");
  const [schemaKey, setSchemaKey] = useState<number>(0);

  if (!tables.length) return null;

  return (
    <>
      <Btn
        iconPath={mdiRelationManyToMany}
        className="fit "
        title="Show schema diagram"
        data-command="SchemaGraph"
        variant="outline"
        onClick={() => {
          setShowSchemaDiagram(true);
        }}
      />

      {showSchemaDiagram && (
        <Popup
          title={
            <FlexRow className="w-full">
              <div>Schema diagram</div>
              <FlexRow
                className="font-16   f-1 relative s-fit"
                style={{ fontWeight: "normal" }}
                // style={{
                //   position: "absolute",
                //   top: "0",
                //   left: "0",
                //   backdropFilter: "blur(2px)",
                // }}
              >
                <Select
                  value={displayMode}
                  label="Tables"
                  variant="pill"
                  btnProps={{
                    className: "shadow",
                    style: {
                      backgroundColor: "var(--bg-color-0)",
                    },
                  }}
                  fullOptions={DISPLAY_MODES}
                  onChange={setDisplayMode}
                />
                <Select
                  value={columnDisplayMode}
                  label="Columns"
                  variant="pill"
                  btnProps={{
                    className: "shadow",
                    style: {
                      backgroundColor: "var(--bg-color-0)",
                    },
                  }}
                  fullOptions={COLUMN_FILTER}
                  onChange={setColumnDisplayMode}
                />
                <Select
                  value={columnColorMode}
                  label="Color mode"
                  btnProps={{
                    className: "shadow",
                    style: {
                      backgroundColor: "var(--bg-color-0)",
                    },
                  }}
                  fullOptions={COLUMN_COLOR_MODES}
                  onChange={setColumnColorMode}
                />
                {columnColorMode !== "default" && (
                  <FlexRowWrap>
                    {" "}
                    {getEntries(CASCADE_LEGEND).map(([label, color]) => (
                      <Chip key={label} style={{ color }}>
                        {label}
                      </Chip>
                    ))}
                  </FlexRowWrap>
                )}
              </FlexRow>
              <FlexRow
                className="p-1  f-1 relative s-fit"
                // style={{
                //   position: "absolute",
                //   top: "0",
                //   right: "0",
                //   backdropFilter: "blur(2px)",
                // }}
              >
                <Btn
                  className="ml-auto"
                  size="small"
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
                      },
                    );
                    setSchemaKey((k) => k + 1);
                  }}
                >
                  Reset layout
                </Btn>
              </FlexRow>
            </FlexRow>
          }
          positioning="fullscreen"
          clickCatchStyle={{ opacity: 1 }}
          contentClassName="o-visible relative "
          onClose={() => setShowSchemaDiagram(false)}
        >
          <ERDSchema
            key={schemaKey}
            {...props}
            displayMode={displayMode}
            columnDisplayMode={columnDisplayMode}
            columnColorMode={columnColorMode}
          />
        </Popup>
      )}
    </>
  );
};
// }

export const getSchemaTableColY = (i, height) => {
  return (!i ? 8 : 16) + i * 20 - height / 2;
};
