import {
  type ProstglesError,
  type ValidatedColumnInfo,
  getKeys,
  isObject,
} from "prostgles-types";
import { useCallback } from "react";
import type { SmartFormProps, SmartFormState } from "./SmartFormV2";
import type { SmartFormStateV2 } from "./useSmartForm";
import type { SmartFormActionState } from "./useSmartFormAction";
import type { SmartFormErrorState } from "./useSmartFormError";

export const useSmartFormSetColumn = (
  props: SmartFormProps & SmartFormActionState & SmartFormErrorState,
) => {
  const setColumnData = useCallback(
    async (
      column: Pick<ValidatedColumnInfo, "is_pkey" | "name" | "tsDataType">,
      newVal: any,
    ) => {
      const { db, tableName, rowFilter, onChange, onSuccess } = props;

      const {
        localChanges,
        confirmUpdates = props.confirmUpdates ?? false,
        errors,
        action,
        setNewRow,
        setLocalRowFilter,
      } = props;

      const { currentRow = {} } = action;

      const newRow = {
        ...(state.newRow ?? {}),
        [column.name]: newVal,
      };
      const oldRow = Object.keys(newRow).reduce(
        (a, key) => ({
          ...a,
          [key]: currentRow[key],
        }),
        {},
      );
      let newState: Pick<SmartFormState, "errors"> = {};

      if (action.type === "update") {
        getKeys(newRow).forEach((key) => {
          /* Remove updates that change nothing */
          if (newRow[key] === currentRow[key] && key in currentRow) {
            delete newRow[key];
          }
        });
      }

      /* Remove empty updates */
      if (newRow[column.name] === "" && column.tsDataType !== "string") {
        delete newRow[column.name];
      }

      if (!onChange && rowFilter && !confirmUpdates) {
        try {
          const f = await state.getValidatedRowFilter();
          if (!f) throw "No update filter provided";
          const newRow = await db[tableName]?.update?.(
            f,
            { [column.name]: newVal },
            { returning: "*" },
          );
          onSuccess?.("update", newRow as any);
        } catch (_e: any) {
          state.parseError(_e);
          return;
        }
      } else {
        setNewRow(newRow);
      }

      /** Update rowFilter to ensure the record does not dissapear after updating */
      if (
        !confirmUpdates &&
        rowFilter &&
        column.is_pkey &&
        rowFilter.find((f) => f.fieldName === column.name)
      ) {
        setLocalRowFilter(
          rowFilter.map((f) =>
            f.fieldName === column.name ? { ...f, value: newVal } : f,
          ),
        );
      }
      onChange?.(newRow);

      let _errors;
      if (errors) {
        _errors = { ...errors };
        delete _errors[column.name];
        newState = {
          ...newState,
          errors: _errors,
        };
      }

      this.setState({
        ...newState,
        error: undefined,
        localChanges: localChanges.slice(0).concat([{ oldRow, newRow }]),
      });
    },
    [props, state],
  );

  return { setColumnData };
};
