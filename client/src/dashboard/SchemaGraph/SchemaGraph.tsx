import { mdiRelationManyToMany } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import React, { useState } from "react";
import type { Prgl } from "../../App";
import Btn from "@components/Btn";
import Popup from "@components/Popup/Popup";
import type { DBSchemaTablesWJoins } from "../Dashboard/dashboardUtils";
import type { DBS } from "../Dashboard/DBS";
import { ERDSchema } from "./ERDSchema/ERDSchema";
import {
  SchemaGraphControls,
  useSchemaGraphControls,
} from "./SchemaGraphControls";
import type { Connection } from "../../pages/NewConnection/NewConnnectionForm";

export type SchemaGraphProps = Pick<Prgl, "connectionId" | "theme"> & {
  db: DBHandlerClient;
  dbs: DBS;
  tables: DBSchemaTablesWJoins;
  db_schema_filter: Connection["db_schema_filter"];
};

export const SchemaGraph = (props: SchemaGraphProps) => {
  const [showSchemaDiagram, setShowSchemaDiagram] = useState(false);
  const controlState = useSchemaGraphControls();
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
          title={<SchemaGraphControls {...props} {...controlState} />}
          positioning="fullscreen"
          clickCatchStyle={{ opacity: 1 }}
          contentClassName="o-visible relative "
          onClose={() => setShowSchemaDiagram(false)}
          data-command="SchemaGraph"
        >
          <ERDSchema
            key={controlState.schemaKey + props.theme}
            {...props}
            {...controlState}
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
