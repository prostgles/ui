import React from "react";
import { FlexCol } from "../../components/Flex";
import { OnMountFunction } from "./OnMountFunction";
import { PublishedMethods } from "../W_Method/PublishedMethods";
import type { Prgl } from "../../App";

export const ServerSideFunctions = (prgl: Prgl) => {
  const [libsLoaded, setLibsLoaded] = React.useState(false);
  const onLoaded = React.useCallback(() => {
    setLibsLoaded(true);
  }, []);
  return (
    <FlexCol className="w-full" style={{ gap: "2em" }}>
      <OnMountFunction {...prgl} onLoaded={onLoaded} />
      {libsLoaded && (
        <PublishedMethods
          prgl={prgl}
          editedRule={undefined}
          accessRuleId={undefined}
        />
      )}
    </FlexCol>
  );
};
