import { useEffect, useState } from "react";
import { isDefined } from "../../../utils/utils";
import type { DBSchemaTableWJoins } from "../../Dashboard/dashboardUtils";
import type { SmartFormMode } from "../useSmartFormMode";

export const useActiveJoinedRecordsTab = ({
  rootDivRef,
  tableName,
  tables,
  actionType,
}: {
  actionType: SmartFormMode["type"];
  tableName: string;
  tables: DBSchemaTableWJoins[];
  rootDivRef: React.RefObject<HTMLDivElement>;
}) => {
  const [activeJoinedRecordsTab, setActiveJoinedRecordsTab] =
    useState<string>();

  /**
   * For convenience, close joined records tab when clicking on the form fields section
   */
  const joinedRecordsIsOpened = !!activeJoinedRecordsTab;
  useEffect(() => {
    if (!joinedRecordsIsOpened) return;
    const clickAwayListener: EventListener = (e) => {
      const rootDiv = rootDivRef.current;
      if (!rootDiv) return;
      const parentFormFields = rootDiv
        .closest(".SmartForm")
        ?.querySelector(".SmartFormFieldList");
      const clickPath = e.composedPath();
      if (
        parentFormFields &&
        !clickPath.includes(rootDiv) &&
        clickPath.includes(parentFormFields)
      ) {
        setActiveJoinedRecordsTab("");
      }
    };
    document.addEventListener("click", clickAwayListener);
    return () => {
      document.removeEventListener("click", clickAwayListener);
    };
  }, [setActiveJoinedRecordsTab, joinedRecordsIsOpened, rootDivRef]);

  /** If is insert and a table record is required then show it */
  useEffect(() => {
    if (isDefined(activeJoinedRecordsTab) || actionType !== "insert") return;
    const table = tables.find((t) => t.name === tableName);
    const requiredNestedInsert = table?.info.requiredNestedInserts?.[0];
    if (requiredNestedInsert) {
      setActiveJoinedRecordsTab(requiredNestedInsert.ftable);
    }
  }, [
    activeJoinedRecordsTab,
    actionType,
    tables,
    setActiveJoinedRecordsTab,
    tableName,
  ]);

  return { activeJoinedRecordsTab, setActiveJoinedRecordsTab };
};
