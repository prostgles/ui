import React from "react";
import { FlexCol } from "../../components/Flex";
import { OnMountFunction } from "./OnMountFunction";
import { PublishedMethods } from "../W_Method/PublishedMethods";
import type { Prgl } from "../../App";
import Loading from "../../components/Loading";

export const ServerSideFunctions = (prgl: Prgl) => {
  /**
   * Hiding PublishedMethods until OnMountFunction is loaded
   * is done to prevent flaky tests when creating function
   */
  const [libsLoaded, setLibsLoaded] = React.useState(false);
  const onLoaded = React.useCallback(() => {
    setLibsLoaded(true);
  }, []);
  return (
    <FlexCol className="w-full" style={{ gap: "2em" }}>
      <OnMountFunction {...prgl} onLoaded={onLoaded} />
      {!libsLoaded ?
        <Loading />
      : <PublishedMethods
          prgl={prgl}
          editedRule={undefined}
          accessRuleId={undefined}
        />
      }
    </FlexCol>
  );
};
