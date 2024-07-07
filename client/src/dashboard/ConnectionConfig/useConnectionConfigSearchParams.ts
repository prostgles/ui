import { useSearchParams } from "react-router-dom";

export const useConnectionConfigSearchParams = (connectionConfigItems: string[]) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const activeSection = connectionConfigItems.find(s => s === searchParams.get("section")) ?? connectionConfigItems[0];
  const setSection = <S extends typeof connectionConfigItems[number],>({ section, opts }: { section: S | undefined; opts?: S extends "access_control"? { ruleId?: string; tableName?: string; } : never }) => {
    if(!section) {
      searchParams.delete("section");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ section, ...opts });
    }
  }
  return { activeSection, setSection };
}