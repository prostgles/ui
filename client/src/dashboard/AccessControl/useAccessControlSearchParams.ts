import { useSearchParams } from "react-router-dom";
import type { AccessControlAction } from "./AccessControl";
import { isEqual } from "prostgles-types";

const SEARCH_PARAMS = {
  SELECTED_RULE_ID: "editRuleId",
  CREATE_RULE: "createRule",
  // EDITED_TABLE_NAME: "editedTableName",
} as const;

const getActionFromSearchParams = (
  searchParams: URLSearchParams,
): AccessControlAction | undefined => {
  const selectedRuleId = searchParams.get(SEARCH_PARAMS.SELECTED_RULE_ID);
  const createRule = searchParams.get(SEARCH_PARAMS.CREATE_RULE);
  // const editedTableName = searchParams.get(SEARCH_PARAMS.EDITED_TABLE_NAME);
  const action: AccessControlAction | undefined =
    selectedRuleId ?
      {
        type: "edit",
        selectedRuleId: +selectedRuleId,
      }
    : createRule ?
      {
        type: "create",
      }
    : undefined;

  return action;
};

export const useAccessControlSearchParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const action = getActionFromSearchParams(searchParams);

  const setAction = (newAction: AccessControlAction | undefined) => {
    /** useSearchParams is not instant so must get the actual latest value */
    const currentAction = getActionFromSearchParams(
      new URLSearchParams(window.location.search),
    );
    if (isEqual(newAction, currentAction)) return;

    if (!newAction) {
      searchParams.delete(SEARCH_PARAMS.CREATE_RULE);
      searchParams.delete(SEARCH_PARAMS.SELECTED_RULE_ID);
      setSearchParams(searchParams);
    } else if (newAction.type === "create") {
      searchParams.delete(SEARCH_PARAMS.SELECTED_RULE_ID);
      searchParams.set(SEARCH_PARAMS.CREATE_RULE, "true");
      setSearchParams(searchParams);
    } else if (newAction.type === "create-default") {
      searchParams.delete(SEARCH_PARAMS.SELECTED_RULE_ID);
      searchParams.delete(SEARCH_PARAMS.CREATE_RULE);
      setSearchParams(searchParams);
    } else {
      searchParams.delete(SEARCH_PARAMS.CREATE_RULE);
      searchParams.set(
        SEARCH_PARAMS.SELECTED_RULE_ID,
        newAction.selectedRuleId.toString(),
      );
      setSearchParams(searchParams);
    }
  };

  return { action, setAction };
};

export const getAccessControlHref = ({
  connectionId,
  ...otherOpts
}: {
  connectionId: string;
  selectedRuleId?: string;
  tableName?: string;
}) => {
  const sp = new URLSearchParams();
  sp.set("section", "access_control");
  if (otherOpts.selectedRuleId)
    sp.set(SEARCH_PARAMS.SELECTED_RULE_ID, otherOpts.selectedRuleId);
  return `/connection-config/${connectionId}?${sp}`;
};
