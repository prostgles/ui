import { getEntries } from "@common/utils";
import Btn from "@components/Btn";
import { SearchList } from "@components/SearchList/SearchList";
import { mdiFunction, mdiPlus } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React, { useState } from "react";
import { NewMethod } from "../W_Method/NewMethod";
import { ensureFadeDoesNotShowForOneItem } from "./DashboardMenuContent";
import { DashboardMenuSection } from "./DashboardMenuSection";

type P = {
  onPressFunction: (functionName: string) => void;
};
export const ServerFunctionList = ({ onPressFunction }: P) => {
  const { methods, sql, connectionId } = usePrgl();
  const [showNewFunction, setShowNewFunction] = useState(false);
  const detailedMethods = getEntries(methods).map(([name, info]) => ({
    ...info,
    name: name as string,
  }));

  if (!detailedMethods.length && !sql) {
    return null;
  }

  return (
    <DashboardMenuSection
      title="Functions"
      itemCount={detailedMethods.length}
      addButton={
        <>
          {sql && (
            <Btn
              title="Create TS Function"
              iconPath={mdiPlus}
              size="small"
              color="action"
              onClick={() => setShowNewFunction(true)}
            />
          )}
          {showNewFunction && (
            <NewMethod
              connectionId={connectionId}
              access_rule_id={undefined}
              onClose={() => setShowNewFunction(false)}
              methodId={undefined}
            />
          )}
        </>
      }
    >
      {Boolean(detailedMethods.length) && (
        <SearchList
          limit={100}
          noSearchLimit={0}
          data-command="dashboard.menu.serverSideFunctionsList"
          className={"search-list-functions f-1 min-h-0 max-h-fit "}
          style={ensureFadeDoesNotShowForOneItem}
          placeholder={"Search " + detailedMethods.length + " functions"}
          items={detailedMethods.map((t) => ({
            iconLeft: {
              type: "Icon",
              path: mdiFunction,
            },
            key: t.name,
            label: t.name,
            subLabel: t.description,
            onPress: () => onPressFunction(t.name),
          }))}
        />
      )}
    </DashboardMenuSection>
  );
};
