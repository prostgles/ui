import { mdiRelationManyToMany } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol, FlexRow } from "../../components/Flex";
import Popup from "../../components/Popup/Popup";
import Select from "../../components/Select/Select";
import type { DBSchemaTablesWJoins } from "../Dashboard/dashboardUtils";
import type { DBS } from "../Dashboard/DBS";
import { ERDSchema } from "./ERDSchema/ERDSchema";

export type SchemaGraphProps = Pick<Prgl, "connectionId"> & {
  db: DBHandlerClient;
  dbs: DBS;
  tables: DBSchemaTablesWJoins;
};

const DISPLAY_MODES = [
  { key: "all", label: "All tables" },
  { key: "relations", label: "With relations" },
  { key: "leaf", label: "Without relations" },
] as const;

export type SchemaGraphDisplayMode = (typeof DISPLAY_MODES)[number]["key"];

export const SchemaGraph = (props: SchemaGraphProps) => {
  const { tables, connectionId, dbs } = props;
  const [showSchemaDiagram, setShowSchemaDiagram] = useState(false);
  const [displayMode, setDisplayMode] = useState<SchemaGraphDisplayMode>("all");
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
      >
        Schema diagram
      </Btn>

      {showSchemaDiagram && (
        <Popup
          title="Schema diagram"
          positioning="fullscreen"
          clickCatchStyle={{ opacity: 1 }}
          contentClassName="o-visible relative "
          onClose={() => setShowSchemaDiagram(false)}
        >
          <FlexRow
            className="p-1  f-1 relative s-fit"
            style={{
              position: "absolute",
              top: "0",
              left: "0",
              backdropFilter: "blur(2px)",
            }}
          >
            <Select
              value={displayMode}
              // label="Display"
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
          </FlexRow>
          <FlexRow
            className="p-1  f-1 relative s-fit"
            style={{
              position: "absolute",
              top: "0",
              right: "0",
              backdropFilter: "blur(2px)",
            }}
          >
            <Btn
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
          <ERDSchema key={schemaKey} {...props} displayMode={displayMode} />
        </Popup>
      )}
    </>
  );
};
// }

export const getSchemaTableColY = (i, height) => {
  return (!i ? 8 : 16) + i * 20 - height / 2;
};
