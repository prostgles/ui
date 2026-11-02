import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { JSONBSchema } from "@components/JSONBSchema/JSONBSchema";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import {
  getJSONBObjectSchemaValidationError,
  type JSONB,
} from "prostgles-types";
import React, { useState } from "react";
import type { TargetPath } from "../tableUtils/getJoinPaths";

export const JoinPathParameters = ({
  targetPath,
  schema,
  onApply,
  onCancel,
}: {
  targetPath: TargetPath;
  schema: JSONB.ObjectType["type"];
  onApply: (targetPath: TargetPath) => void;
  onCancel: () => void;
}) => {
  const { db, tables } = usePrgl();
  const [params, setParams] = useState(targetPath.path[0]?.params ?? {});
  const { error } = getJSONBObjectSchemaValidationError(schema, params);
  const inputSchema: JSONB.JSONBSchema = { type: schema };
  return (
    <FlexCol data-command="JoinPathParameters" className="gap-1">
      <JSONBSchema
        schema={inputSchema}
        value={params}
        onChange={setParams}
        db={db}
        tables={tables}
        allowIncomplete
        debounceInputs={false}
        showErrors
      />
      <FlexRow>
        <Btn onClick={onCancel}>Cancel</Btn>
        <Btn
          color="action"
          variant="filled"
          disabledInfo={error}
          onClick={() =>
            onApply({
              ...targetPath,
              path: targetPath.path.map((step) => ({ ...step, params })),
            })
          }
        >
          Apply parameters
        </Btn>
      </FlexRow>
    </FlexCol>
  );
};
