import { mdiPencil, mdiResize } from "@mdi/js";
import { type AnyObject, type ValidatedColumnInfo } from "prostgles-types";
import React, { useMemo, useState } from "react";
import Btn from "../../components/Btn";
import { FlexCol } from "../../components/Flex";
import { SmartForm } from "../SmartForm/SmartForm";
import type { SmartCardProps } from "./SmartCard";

export const SmartCardActions = <T extends AnyObject>(
  props: SmartCardProps<T> & {
    defaultData: AnyObject;
    cardColumns: ValidatedColumnInfo[];
  },
) => {
  const {
    getActions,
    tableName,
    db,
    tables,
    onChange,
    showViewEditBtn,
    methods,
    smartFormProps,
    enableInsert,
    defaultData,
    rowFilter,
    cardColumns,
  } = props;
  const [editMode, setEditMode] = useState(false);

  const localRowFilter = useMemo(() => {
    if (rowFilter) return rowFilter;
    const hasPkeys = cardColumns.some((c) => c.is_pkey);
    const pkeyCols = cardColumns.filter(
      (c) =>
        (hasPkeys ? c.is_pkey : c.references?.length) && defaultData[c.name],
    );
    if (pkeyCols.some((c) => defaultData[c.name])) {
      return pkeyCols.map((c) => ({
        fieldName: c.name,
        value: defaultData[c.name],
      }));
    }
    return rowFilter;
  }, [cardColumns, defaultData, rowFilter]);

  const tableHandler =
    typeof tableName === "string" ? db[tableName] : undefined;
  const allowedActions = {
    view: showViewEditBtn && Boolean(tableHandler?.find && localRowFilter),
    delete: showViewEditBtn && Boolean(tableHandler?.delete && localRowFilter),
    update:
      showViewEditBtn &&
      (Boolean(onChange) || Boolean(tableHandler?.update && localRowFilter)),
    insert: Boolean(tableHandler?.insert),
  };

  const showViewEditRow =
    allowedActions.update || allowedActions.delete || allowedActions.view;

  const extraActions = getActions?.(defaultData);
  if (!showViewEditRow && !extraActions) {
    return null;
  }

  return (
    <FlexCol>
      {showViewEditRow && (
        <Btn
          className="f-0 show-on-parent-hover"
          data-command="SmartCard.viewEditRow"
          iconPath={
            allowedActions.update || allowedActions.delete ?
              mdiPencil
            : mdiResize
          }
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEditMode(true);
          }}
        />
      )}
      {extraActions}
      {editMode && typeof tableName === "string" && (
        <SmartForm
          db={db}
          tables={tables}
          methods={methods}
          asPopup={true}
          tableName={tableName}
          onChange={onChange}
          rowFilter={localRowFilter}
          confirmUpdates={true}
          enableInsert={enableInsert}
          {...smartFormProps}
          onClose={() => {
            setEditMode(false);
          }}
        />
      )}
    </FlexCol>
  );
};
