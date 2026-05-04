import Btn from "@components/Btn";
import Popup from "@components/Popup/Popup";
import { mdiRelationManyToMany } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import type { Connection } from "../../pages/NewConnection/NewConnnectionForm";
import type { DBS } from "../Dashboard/DBS";
import { ERDSchema } from "./ERDSchema/ERDSchema";
import {
  SchemaGraphControls,
  useSchemaGraphControls,
} from "./SchemaGraphControls";

export type SchemaGraphProps = Pick<
  Prgl,
  "connectionId" | "theme" | "sql" | "tables"
> & {
  dbs: DBS;
  db_schema_filter: Connection["db_schema_filter"];
};

export const SchemaGraph = () => {
  const [showSchemaDiagram, setShowSchemaDiagram] = useState(false);
  const controlState = useSchemaGraphControls();
  const { theme } = usePrgl();
  return (
    <>
      <Btn
        iconPath={mdiRelationManyToMany}
        className="fit "
        title="Show schema diagram"
        data-command={showSchemaDiagram ? undefined : "SchemaGraph"}
        variant="outline"
        onClick={() => {
          setShowSchemaDiagram(true);
        }}
      />

      {showSchemaDiagram && (
        <Popup
          title={<SchemaGraphControls {...controlState} />}
          positioning="fullscreen"
          clickCatchStyle={{ opacity: 1 }}
          contentClassName="o-visible relative "
          onClose={() => setShowSchemaDiagram(false)}
          data-command="SchemaGraph"
        >
          <ERDSchema key={controlState.schemaKey + theme} {...controlState} />
        </Popup>
      )}
    </>
  );
};

export const getSchemaTableColY = (i, height) => {
  return (!i ? 8 : 16) + i * 20 - height / 2;
};
