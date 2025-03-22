import { type ValidatedColumnInfo } from "prostgles-types";
import { useCallback, useMemo, useState } from "react";
import { getSmartGroupFilter } from "../../../../../commonTypes/filterUtils";
import type { ConfirmDialogProps } from "../../../components/ConfirmationDialog";
import type { SmartFormProps } from "../SmartForm";
import type { SmartFormNewRowState } from "../useNewRowDataHandler";
import type { SmartFormState } from "../useSmartForm";
import type { SmartFormMode } from "../useSmartFormMode";

type ConfirmationPopup = Pick<
  ConfirmDialogProps,
  "message" | "acceptBtn" | "onClose" | "onAccept"
>;

type Args = Pick<
  SmartFormProps,
  | "fixedData"
  | "parentForm"
  | "disabledActions"
  | "onSuccess"
  | "onInserted"
  | "db"
  | "confirmUpdates"
> &
  SmartFormNewRowState &
  SmartFormState;

export const useSmartFormActions = ({
  mode,
  fixedData,
  newRow,
  parentForm,
  disabledActions,
  newRowDataHandler,
  table,
  db,
  setLoading,
  onSuccess,
  onInserted,
  setError,
  setErrors,
  parseError,
  confirmUpdates,
}: Args): {
  successMessage: string | undefined;
  setSuccessMessage: (msg: string | undefined) => void;
  confirmPopup: ConfirmationPopup | undefined;
  buttons:
    | {
        onClickInsert?: () => Promise<void>;
        onClickUpdate?: () => Promise<void>;
        onClickDelete?: () => Promise<void>;
        onClickClone?: () => void;
      }
    | undefined;
} => {
  const [confirmPopup, setConfirmPopup] = useState<ConfirmationPopup>();
  const [successMessage, setSuccessMessage] = useState<string>();

  const performAction = useCallback(
    async (action: () => Promise<void>) => {
      setLoading(true);
      try {
        await action();
        setError(undefined);
        setErrors({});
      } catch (error: any) {
        console.error(error);
        parseError(error);
      }
      setLoading(false);
    },
    [setLoading, setError, setErrors, parseError],
  );

  const newRowWithUpdates = useMemo(() => {
    return (
      newRow && {
        ...newRow,
        ...fixedData,
      }
    );
  }, [fixedData, newRow]);

  const buttons = useMemo(() => {
    if (mode.type === "manual") {
      return undefined;
    }
    if (mode.type === "insert") {
      return {
        onClickInsert: async () => {
          return performAction(async () => {
            if (!newRow) throw "No row data to insert";
            if (parentForm?.type === "insert") {
              parentForm.setColumnData(newRowDataHandler);
              return;
            }

            const doInsert = async () => {
              if (table.info.isFileTable && parentForm) {
                const { table: parentTable, rowFilter: parentRowFilter } =
                  parentForm;
                const pkeyColumns = parentTable.columns
                  .filter((c) => c.is_pkey)
                  .map((c) => c.name);
                if (!pkeyColumns.length) {
                  throw (
                    "No primary key columns found in parent form table " +
                    parentForm.table.name
                  );
                }
                const parentTableName = parentTable.name;
                const parentTableHandler = db[parentTableName];
                if (!parentTableHandler?.update) {
                  throw "Not allowed to update referenced table";
                }
                const filter = getSmartGroupFilter(parentRowFilter);
                const count = await parentTableHandler.count?.(filter);
                if (+(count ?? 0) !== 1) {
                  throw "Could not match to exactly 1 row";
                }
                return parentTableHandler.update(filter, {
                  [parentForm.column.name]: newRow,
                });
              }

              return mode.tableHandlerInsert(
                newRow,
                onInserted || onSuccess ? { returning: "*" } : {},
              );
            };
            const result = await doInsert();
            onSuccess?.("insert", result);
            onInserted?.(result);

            setSuccessMessage("Inserted");
          });
        },
      };
    }
    if (mode.type === "update" || mode.type === "multiUpdate") {
      const { tableHandlerUpdate, tableHandlerDelete } = mode;
      if (
        !(
          !confirmUpdates ||
          !newRowWithUpdates ||
          !tableHandlerUpdate ||
          disabledActions?.includes("update")
        )
      ) {
        return {
          onClickUpdate: async () => {
            return performAction(async () => {
              setConfirmPopup({
                message: "Are you sure you want to update?",
                acceptBtn: {
                  dataCommand: "SmartForm.update.confirm",
                  text: "Update row!",
                  color: "action",
                },
                onAccept: async () => {
                  setConfirmPopup(undefined);

                  await performAction(async () => {
                    const nr = await tableHandlerUpdate(
                      mode.rowFilterObj,
                      newRowWithUpdates,
                      {
                        returning: "*",
                      },
                    );
                    onSuccess?.("update", nr as any);
                    setSuccessMessage("Updated");
                  });
                },
                onClose: () => setConfirmPopup(undefined),
              });
            });
          },
        };
      }
      return {
        onClickDelete:
          !tableHandlerDelete || disabledActions?.includes("delete") ?
            undefined
          : async () => {
              setConfirmPopup({
                message: "Are you sure you want to delete this?",
                acceptBtn: {
                  dataCommand: "SmartForm.delete.confirm",
                  text: "Delete!",
                  color: "danger",
                },
                onAccept: async () => {
                  setConfirmPopup(undefined);
                  await performAction(async () => {
                    await tableHandlerDelete(mode.rowFilterObj);
                    onSuccess?.("delete");
                    setSuccessMessage("Deleted");
                  });
                },
                onClose: () => {
                  setConfirmPopup(undefined);
                },
              });
            },
        onClickClone:
          (
            mode.type !== "update" ||
            !mode.clone ||
            disabledActions?.includes("clone")
          ) ?
            undefined
          : mode.clone,
      };
    }
  }, [
    mode,
    performAction,
    newRowDataHandler,
    parentForm,
    disabledActions,
    table,
    newRow,
    onInserted,
    onSuccess,
    db,
    setSuccessMessage,
    newRowWithUpdates,
    confirmUpdates,
  ]);

  return { successMessage, setSuccessMessage, confirmPopup, buttons };
};
export type SmartFormActionsState = ReturnType<typeof useSmartFormActions>;
