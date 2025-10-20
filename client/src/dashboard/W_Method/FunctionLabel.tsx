import React from "react";
import { FlexCol, FlexRow } from "../../components/Flex";
import type { DBSSchema } from "../../../../common/publishUtils";

export const FunctionLabel = ({
  name,
  description,
  arguments: args,
}: DBSSchema["published_methods"]) => {
  return (
    <FlexCol className="gap-p5 m-auto">
      <FlexRow className="gap-p25">
        <div>{name}</div>
        <div className="text-2">
          {!args.length ?
            " ()"
          : ` ({ ${args.map((a) => `${a.name}: ${a.type === "Lookup" ? `${a.lookup.table}.${a.lookup.column}` : ""}`).join("; ")} })`
          }
        </div>
      </FlexRow>
      {!!description.trim() && <div className="text-2">{description}</div>}
    </FlexCol>
  );
};
