import { getEntries } from "@common/utils";
import type { TabItems } from "@components/Tabs";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

export const useConnectionConfigSearchParams = <Items extends TabItems<string>>(
  connectionConfigItems: Items,
) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamSection = searchParams.get("section");
  const itemEntries = useMemo(
    () => getEntries(connectionConfigItems),
    [connectionConfigItems],
  );
  const enabledItems = itemEntries.filter(([, item]) => !item.hide && !item.disabledText);
  const activeSection =
    enabledItems.find(([key]) => key === searchParamSection)?.[0] ?? enabledItems[0]?.[0];
  const setSection = <S extends keyof Items & string>({
    section,
    opts,
  }: {
    section: S | undefined;
    opts?: S extends "access_control" ? { ruleId?: string; tableName?: string }
    : never;
  }) => {
    if (!section) {
      searchParams.delete("section");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ section, ...opts });
    }
  };
  return { activeSection, setSection };
};
