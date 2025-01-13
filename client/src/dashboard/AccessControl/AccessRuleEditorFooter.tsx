import { isDefined, omitKeys } from "prostgles-types";
import React, { useState } from "react";
import { SuccessMessage } from "../../components/Animations";
import type { BtnProps } from "../../components/Btn";
import { ButtonBar } from "../../components/ButtonBar";
import ClickCatch from "../../components/ClickCatch";
import type { DBS } from "../Dashboard/DBS";
import type {
  AccessControlAction,
  AccessRule,
  EditedAccessRule,
} from "./AccessControl";
import { FlexCol } from "../../components/Flex";
import ErrorComponent from "../../components/ErrorComponent";
import type { ValidEditedAccessRuleState } from "./useEditedAccessRule";

type P = {
  onCancel: VoidFunction;
  action: AccessControlAction;
  dbs: DBS;
  connectionId: string;
  database_id: number;
  error: any | undefined;
  editedRule: ValidEditedAccessRuleState | undefined;
};
export const AccessRuleEditorFooter = (props: P) => {
  const {
    dbs,
    action,
    database_id,
    connectionId,
    onCancel,
    error: wspError,
    editedRule,
  } = props;

  const [localError, setLocalError] = useState<any>();
  const [success, setSuccess] = useState("");

  const { selectedRuleId } = action;

  if (success) {
    return (
      <ClickCatch style={{ zIndex: 1 }}>
        <SuccessMessage
          message={success}
          className="absolute-centered bg-color-0 rounded"
          style={{ padding: "4em" }}
        />
      </ClickCatch>
    );
  }
  const { newRule, onChange, ruleWasEdited, type, ruleErrorMessage } =
    editedRule ?? {};
  const error = wspError || localError || ruleErrorMessage;

  return (
    <FlexCol>
      <ErrorComponent error={error} variant="outlined" />
      {newRule && onChange && type !== "create" && (
        <ButtonBar
          error={localError}
          buttons={(
            [
              {
                children: "Cancel",
                "data-command": "config.ac.cancel",
                onClick: onCancel,
                variant: "faded",
              },
              selectedRuleId ?
                ({
                  children: "Remove rule",
                  className: "ml-auto w-fit",
                  variant: "faded",
                  "data-command": "config.ac.removeRule",
                  color: "danger",
                  onClickPromise: async () => {
                    try {
                      await dbs.access_control_user_types.delete({
                        access_control_id: selectedRuleId,
                      });
                      await dbs.access_control.delete({ id: selectedRuleId });
                      onChange({ ...newRule, access_control_user_types: [] });
                      onCancel();
                    } catch (error) {
                      setLocalError(error);
                    }
                  },
                } satisfies BtnProps<void>)
              : undefined,
              {
                children: !selectedRuleId ? `Create rule` : `Update rule`,
                variant: "filled",
                color: "action",
                disabledInfo:
                  wspError ? "Must fix errors" : (
                    ruleErrorMessage ||
                    localError ||
                    (ruleWasEdited ? undefined : "Nothing to update")
                  ),
                "data-command": "config.ac.save",
                onClickPromise: async () => {
                  try {
                    await upsertRule({
                      action,
                      newRule,
                      database_id,
                      connectionId,
                      dbs,
                    });
                    setLocalError(undefined);

                    setSuccess(
                      !selectedRuleId ? `Rule created!` : `Rule updated!`,
                    );
                    setTimeout(onCancel, 1000);
                  } catch (e: any) {
                    setLocalError(e);
                  }
                },
              } satisfies BtnProps<void>,
            ] as const
          ).filter(isDefined)}
        />
      )}
    </FlexCol>
  );
};

const upsertRule = async (
  args: Pick<P, "dbs" | "connectionId" | "action" | "database_id"> & {
    newRule: EditedAccessRule;
  },
) => {
  const { action, newRule, dbs, connectionId, database_id } = args;
  const {
    access_control_user_types = [],
    published_methods = [],
    access_control_allowed_llm = [],
    access_control_methods = [],
  } = newRule;

  const connection = await dbs.connections.findOne({ id: connectionId });
  if (!connection || !connectionId) {
    throw `Connection not found (id = ${connectionId})`;
  } else {
    const userGroupNames = access_control_user_types.flatMap((ids) => ids.ids);

    const insertRelatedData = async (access_control_id: number) => {
      await dbs.access_control_user_types.delete({ access_control_id });
      if (userGroupNames.length) {
        await dbs.access_control_user_types.insert(
          userGroupNames.map((user_type) => ({ access_control_id, user_type })),
        );
      }

      await dbs.access_control_methods.delete({ access_control_id });
      if (published_methods.length) {
        await dbs.access_control_methods.insert(
          published_methods.map((m) => ({
            access_control_id,
            published_method_id: m.id,
          })),
        );
      }

      await dbs.access_control_allowed_llm.delete({ access_control_id });
      if (access_control_allowed_llm.length) {
        await dbs.access_control_allowed_llm.insert(
          access_control_allowed_llm.map((m) => ({ ...m, access_control_id })),
        );
      }

      await dbs.access_control_methods.delete({ access_control_id });
      if (access_control_methods.length) {
        await dbs.access_control_methods.insert(
          access_control_methods.map((m) => ({ ...m, access_control_id })),
        );
      }
    };

    const newRuleWithoutSomeExtraKeys = omitKeys(newRule as AccessRule, [
      "access_control_user_types",
      "database_id",
      "published_methods",
      "id",
      "created",
      "access_control_allowed_llm",
      "access_control_methods",
    ]);

    if (action.type === "edit") {
      const { selectedRuleId } = action;
      await dbs.access_control.update(
        { id: selectedRuleId },
        newRuleWithoutSomeExtraKeys,
      );
      await insertRelatedData(selectedRuleId);
    } else {
      const overLappingUserGroups = await dbs.access_control_user_types.find(
        {
          $existsJoined: { "**.connections": { id: connectionId } } as any,
          user_type: { $in: userGroupNames },
        },
        {
          select: { user_type: 1 },
          returnType: "values",
        },
      );
      if (overLappingUserGroups.length) {
        throw `Cannot have rules with overlapping user group names: ${overLappingUserGroups.flat().join(", ")}.\nRemove these group names from this rule or from the other rules`;
      } else {
        const acontrol = await dbs.access_control.insert(
          {
            ...(newRuleWithoutSomeExtraKeys as AccessRule),
            database_id,
            access_control_connections: [
              {
                connection_id: connectionId,
              },
            ],
          },
          { returning: "*" },
        );

        await insertRelatedData(acontrol.id);
      }
    }
  }
};
