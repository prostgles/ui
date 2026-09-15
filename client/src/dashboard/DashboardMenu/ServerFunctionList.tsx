import { getEntries } from "@common/utils";
import { SearchList } from "@components/SearchList/SearchList";
import { mdiFunction } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import React from "react";
import { ensureFadeDoesNotShowForOneItem } from "./DashboardMenuContent";

type P = {
  onPressFunction: (functionName: string) => void;
};
export const ServerFunctionList = ({ onPressFunction }: P) => {
  const { methods } = usePrgl();
  const detailedMethods = getEntries(methods).map(([name, info]) => ({
    ...info,
    name: name as string,
  }));

  if (!detailedMethods.length) {
    return null;
  }

  return (
    <SearchList
      limit={100}
      noSearchLimit={0}
      data-command="dashboard.menu.serverSideFunctionsList"
      className={"search-list-functions b-t f-1 min-h-0 max-h-fit "}
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
  );
};
