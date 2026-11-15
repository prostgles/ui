import React, { useState } from "react";
import type { TableRules, TableRulesErrors } from "@common/publishUtils";
import ErrorComponent from "@components/ErrorComponent";
import { SegmentedToggle } from "@components/SegmentedToggle";
import { SvgIcon } from "@components/SvgIcon";
import Popup from "@components/Popup/Popup";
import type { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";
import { FlexCol } from "@components/Flex";
import { FileTableAccessControlInfo } from "./FileTableAccessControlInfo";
import { DeleteRuleControl } from "./../RuleTypeControls/DeleteRuleControl";
import { InsertRuleControl } from "./../RuleTypeControls/InsertRuleControl";
import { SelectRuleControl } from "./../RuleTypeControls/SelectRuleControl";
import { UpdateRuleControl } from "./../RuleTypeControls/UpdateRuleControl";
import type {
  EditedRuleType,
  TablePermissionControlsProps,
} from "./TablePermissionControls";
import { TABLE_RULE_LABELS } from "./TablePermissionControls";
import { Icon } from "@components/Icon/Icon";
import { mdiFile, mdiTable, mdiTableEye } from "@mdi/js";
import { fromEntries, getEntries } from "@common/utils";
import { SyncRuleControl } from "../RuleTypeControls/SyncRuleControl";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";

type TableRulesPopupProps = TablePermissionControlsProps & {
  table: DBSchemaTablesWJoins[number];
  tableErrors: TableRulesErrors;
  editedRuleType: EditedRuleType;
  onClose: VoidFunction;
};
export const TableRulesPopup = ({
  contextData,
  tablesWithRules: allRules,
  tableRules,
  onChange,
  table,
  tableErrors,
  userTypes,
  onClose,
  ...props
}: TableRulesPopupProps) => {
  const prgl = usePrgl();
  const [editedRuleType, setEditedRuleType] = useState<EditedRuleType>(
    props.editedRuleType,
  );
  const error = tableErrors[editedRuleType] ?? tableErrors.all;
  const contextDataSchema = [
    {
      name: "user",
      columns: prgl.dbsTables.find((t) => t.name === "users")!.columns,
      data: contextData?.user,
    },
  ];

  const [localTableRules, setLocalTableRules] = useState<TableRules | void>();
  const localRules = localTableRules ?? tableRules;
  const onChangeRule = <K extends keyof TableRules>(newRule: TableRules[K]) => {
    setLocalTableRules({
      ...tableRules,
      ...localTableRules,
      [editedRuleType]: newRule,
    });
  };

  const commonProps = {
    prgl,
    table,
    contextDataSchema,
    userTypes,
    tableRules: localRules,
    onChange: onChangeRule,
  };
  const closePopup = () => {
    onChange(localRules);
    onClose();
  };

  const { isFileTable, isView } = table;
  const ruleWasChanged =
    JSON.stringify(tableRules[editedRuleType]) ===
    JSON.stringify(localRules[editedRuleType]);
  return (
    <Popup
      title={table.label}
      subTitle={
        isFileTable ? "File metadata is stored in this table" : undefined
      }
      headerIcon={
        table.icon ?
          <SvgIcon icon={table.icon} />
        : <Icon
            className="text-2"
            path={
              isFileTable ? mdiFile
              : isView ?
                mdiTableEye
              : mdiTable
            }
          />
      }
      headerLeftContent={
        <SegmentedToggle
          className="f-0"
          value={editedRuleType}
          onChange={setEditedRuleType}
          options={fromEntries(
            getEntries(TABLE_RULE_LABELS).map(([key, { label, title }]) => [
              key,
              { title, children: label.mini, iconPath: "", size: "default" },
            ]),
          )}
        />
      }
      positioning="right-panel"
      rootStyle={{ width: "min(900px, 100vw)" }}
      focusTrap={true}
      onClose={closePopup}
      clickCatchStyle={{ opacity: 1 }}
      footerButtons={[
        {
          label: "Cancel",
          onClick: closePopup,
          "data-command": "TablePermissionControls.close",
        },
        {
          label: "Done",
          color: "action",
          variant: "filled",
          "data-command": "TablePermissionControls.done",
          disabledInfo: ruleWasChanged ? "Nothing to change" : undefined,
          onClick: closePopup,
        },
      ]}
    >
      <FlexCol className="gap-2">
        <FileTableAccessControlInfo
          ruleType={editedRuleType}
          table={table}
          tablesWithRules={allRules}
        />
        {editedRuleType === "select" ?
          <SelectRuleControl {...commonProps} />
        : editedRuleType === "insert" ?
          <InsertRuleControl
            {...commonProps}
            rule={localRules[editedRuleType]}
          />
        : editedRuleType === "update" && contextData ?
          <UpdateRuleControl
            {...commonProps}
            rule={localRules[editedRuleType]}
            contextData={contextData}
          />
        : editedRuleType === "delete" ?
          <DeleteRuleControl
            {...commonProps}
            rule={localRules[editedRuleType]}
          />
        : editedRuleType === "sync" ?
          <SyncRuleControl {...commonProps} rule={localRules[editedRuleType]} />
        : null}
        {error && <ErrorComponent error={error} className="m-1" />}
      </FlexCol>
    </Popup>
  );
};
