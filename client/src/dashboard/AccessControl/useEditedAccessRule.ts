import { useIsMounted, usePromise } from "prostgles-client/dist/react-hooks";
import { isEmpty } from "prostgles-types";
import { useMemo, useState } from "react";
import type {
  ContextDataObject,
  TableRulesErrors,
} from "../../../../commonTypes/publishUtils";
import { getTableRulesErrors } from "../../../../commonTypes/publishUtils";
import { areEqual, quickClone } from "../../utils";
import type { AccessControlAction, EditedAccessRule } from "./AccessControl";
import { ACCESS_CONTROL_SELECT } from "./AccessControl";
import type { PermissionEditProps } from "./AccessControlRuleEditor";
import type { WorspaceTableAndColumns } from "./PublishedWorkspaceSelector";
import { getWorkspaceTables } from "./PublishedWorkspaceSelector";

type P = Pick<PermissionEditProps, "action" | "prgl">;

type TableErrors = Record<string, TableRulesErrors>;

const defaultRule: EditedAccessRule = {
  access_control_user_types: [],
  name: "",
  llm_daily_limit: 0,
  dbPermissions: {
    type: "All views/tables",
    allowAllTables: [],
  },
  published_methods: [],
  created: null,
  dbsPermissions: {
    createWorkspaces: true,
  },
  access_control_allowed_llm: [],
  access_control_methods: [],
};

export type ValidEditedAccessRuleState = (
  | (Extract<AccessControlAction, { type: "edit" }> & {
      rule: EditedAccessRule;
      newRule: EditedAccessRule;
      initialUserTypes: string[];
    })
  | {
      type: "create";
      newRule:
        | Partial<
            Pick<
              EditedAccessRule,
              | "access_control_user_types"
              | "dbPermissions"
              | "dbsPermissions"
              | "access_control_allowed_llm"
              | "access_control_methods"
              | "llm_daily_limit"
            >
          >
        | undefined;
      rule: undefined;
      initialUserTypes?: undefined;
    }
  | {
      type: "create-complete";
      newRule: EditedAccessRule;
      rule: undefined;
      initialUserTypes?: undefined;
    }
) & {
  tableErrors: TableErrors | undefined;
  contextData: ContextDataObject | undefined;
  onChange: (newRule: Partial<Omit<EditedAccessRule, "">>) => void;
  userTypes: string[];
  ruleWasEdited: boolean;
  ruleErrorMessage: string | undefined;
  worspaceTableAndColumns: WorspaceTableAndColumns[] | undefined;
};

export type EditedAccessRuleState =
  | ValidEditedAccessRuleState
  | {
      type: "edit-not-found";
    };

export const useEditedAccessRule = ({
  action,
  prgl,
}: P): EditedAccessRuleState | undefined => {
  const { dbs, tables } = prgl;
  const [newRule, setNewRule] = useState<Partial<EditedAccessRule>>();
  const userTypes = useMemo(
    () => newRule?.access_control_user_types?.flatMap((d) => d.ids) ?? [],
    [newRule],
  );

  const getIsMounted = useIsMounted();
  const ruleData = usePromise(async () => {
    if (action.type === "edit") {
      const rule: EditedAccessRule | undefined =
        await dbs.access_control.findOne(
          { id: action.selectedRuleId },
          ACCESS_CONTROL_SELECT,
        );
      if (!rule) {
        return "edit-not-found";
      }
      const userTypes = rule.access_control_user_types.flatMap((d) => d.ids);
      const ruleUserFilter =
        userTypes.length ? { type: { $in: userTypes } } : {};
      let user = await dbs.users.findOne(ruleUserFilter);
      /** If no users for the give types then fake an existing one */
      if (!user) {
        user = await dbs.users.findOne({});
        if (user) {
          user.type = userTypes[0]!;
        }
      }
      if (!getIsMounted()) {
        return undefined;
      }
      const initialUserTypes = rule.access_control_user_types.flatMap(
        (d) => d.ids,
      );
      setNewRule(quickClone(rule));
      return {
        ...action,
        rule: quickClone(rule),
        initialUserTypes,
        contextData: !user ? undefined : { user },
      };
    }
    const user = await dbs.users.findOne({ status: "active" });
    return {
      ...action,
      type: "create" as const,
      rule: undefined,
      contextData: !user ? undefined : { user },
    };
    //@ts-ignore
  }, [getIsMounted, action, dbs.access_control, dbs.users]);

  const wspTables = usePromise(async () => {
    const workspaceIds =
      newRule?.dbsPermissions?.viewPublishedWorkspaces?.workspaceIds ?? [];
    return !newRule?.dbPermissions ?
        undefined
      : await getWorkspaceTables(
          dbs,
          workspaceIds,
          newRule.dbPermissions,
          tables,
        );
  }, [newRule, dbs, tables]);

  const tableErrors = usePromise(async () => {
    if (action.selectedRuleId && newRule) {
      return await getAccessRuleTableErrors({ prgl }, newRule, userTypes);
    }
    return undefined;
  }, [newRule, action.selectedRuleId, prgl, userTypes]);

  if (!ruleData) {
    return undefined;
  }

  if (ruleData === "edit-not-found") {
    return {
      type: ruleData,
    };
  }

  const ruleWasEdited =
    !newRule ? false : (
      action.type === "create" ||
      Boolean(
        ruleData.rule &&
          !areEqual(newRule, ruleData.rule, [
            "access_control_user_types",
            "access_control_allowed_llm",
            "access_control_methods",
            "dbPermissions",
            "dbsPermissions",
            "published_methods",
            "llm_daily_limit",
          ]),
      )
    );

  const result: ValidEditedAccessRuleState = {
    ...ruleData,
    newRule: newRule as any,
    userTypes,
    worspaceTableAndColumns: wspTables?.worspaceTableAndColumns,
    tableErrors,
    ruleErrorMessage: newRule && getRuleErrorMessage(newRule),
    ruleWasEdited,
    onChange: (newRulePart: Partial<EditedAccessRule>) =>
      setNewRule({
        ...newRule,
        ...newRulePart,
      }),
  };

  if (
    result.type === "create" &&
    result.newRule?.access_control_user_types &&
    result.newRule.dbPermissions
  ) {
    return {
      ...result,
      type: "create-complete",
      newRule: {
        ...defaultRule,
        ...newRule,
      },
    };
  }

  return result;
};

const getRuleErrorMessage = (
  newRule: EditedAccessRule | Partial<EditedAccessRule>,
) => {
  const { dbPermissions } = newRule;
  if (dbPermissions && dbPermissions.type !== "Run SQL") {
    const allowedTables =
      dbPermissions.type === "Custom" ?
        !!dbPermissions.customTables.filter(
          (t) => t.select || t.update || t.insert || t.delete,
        ).length
      : !!dbPermissions.allowAllTables.length;

    /** Disabled because sometimes only server functions are needed */
    // if (!allowedTables) {
    //   return "Empty rule. Must allow at least one table";
    // }
  } else if (dbPermissions?.type === "Run SQL" && !dbPermissions.allowSQL) {
    return `Must tick "Run SQL" checkbox`;
  }

  const userTypes =
    newRule.access_control_user_types?.flatMap((d) => d.ids) ?? [];
  if (userTypes.includes("public") && userTypes.length !== 1) {
    return "Cannot mix 'public' and non-public user types";
  }

  return undefined;
};

const getAccessRuleTableErrors = async (
  { prgl: { dbs, tables } }: Pick<P, "prgl">,
  rule: Partial<EditedAccessRule>,
  userTypes: string[],
) => {
  if (
    rule.dbPermissions?.type !== "Custom" ||
    !rule.dbPermissions.customTables.length
  ) {
    return undefined;
  }

  const { dbPermissions } = rule;
  const ruleUser = await dbs.users.findOne({ type: { $in: userTypes } });

  if (ruleUser) {
    const newContextData: ContextDataObject = { user: ruleUser };
    const result: Record<string, TableRulesErrors> = {};
    await Promise.all(
      dbPermissions.customTables.map(async (tableRules) => {
        const tableName = tableRules.tableName;

        if (!tables.some((t) => t.name === tableName)) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          result[tableName] ??= {};
          result[tableName]!.all = `Table ${tableName} could not be found`;
        } else if (!result[tableName]?.all) {
          const columnNames = tables
            .find((t) => t.name === tableName)
            ?.columns.map((c) => c.name);
          const errObj = await getTableRulesErrors(
            tableRules,
            columnNames!,
            newContextData,
          );
          if (!isEmpty(errObj)) {
            result[tableName] = errObj;
          }
        }
      }),
    );
    return result;
  }
};
