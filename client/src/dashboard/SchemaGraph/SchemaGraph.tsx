import { mdiRelationManyToMany } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import Btn from "../../components/Btn";
import { FlexCol } from "../../components/Flex";
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
  const { tables } = props;
  const [showSchemaDiagram, setShowSchemaDiagram] = useState(false);
  const [displayMode, setDisplayMode] = useState<SchemaGraphDisplayMode>("all");

  if (!tables.length) return null;

  return (
    <>
      <Btn
        iconPath={mdiRelationManyToMany}
        className="fit "
        title="Show schema diagram"
        data-command="schema-diagram"
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
          contentClassName="o-visible p-1"
          onClose={() => setShowSchemaDiagram(false)}
        >
          <FlexCol className=" f-1 relative w-full h-full">
            <Select
              value={displayMode}
              label="Display"
              variant="pill"
              fullOptions={DISPLAY_MODES}
              onChange={setDisplayMode}
            />
            <ERDSchema {...props} displayMode={displayMode} />
          </FlexCol>
        </Popup>
      )}
    </>
  );
};
// }

export const getSchemaTableColY = (i, height) => {
  return (!i ? 8 : 16) + i * 20 - height / 2;
};
