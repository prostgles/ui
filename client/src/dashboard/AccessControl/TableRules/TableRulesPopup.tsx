import React, { useState } from "react";
import type {
  TableRules,
  TableRulesErrors,
} from "../../../../../commonTypes/publishUtils";
import ErrorComponent from "../../../components/ErrorComponent";
import { MenuList } from "../../../components/MenuList";
import Popup from "../../../components/Popup/Popup";
import type { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";
import { FlexCol, FlexRow } from "../../../components/Flex";
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
import { Icon } from "../../../components/Icon/Icon";
import { mdiFile, mdiTable, mdiTableEye } from "@mdi/js";
import { getEntries } from "../../../../../commonTypes/utils";
import { SyncRuleControl } from "../RuleTypeControls/SyncRuleControl";

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
  prgl,
  table,
  tableErrors,
  userTypes,
  onClose,
  ...props
}: TableRulesPopupProps) => {
  const [editedRuleType, setEditedRuleType] = useState<EditedRuleType>(
    props.editedRuleType,
  );
  const error = tableErrors[editedRuleType] ?? tableErrors.all;
  const contextDataSchema = [
    {
      name: "user",
      columns: prgl.dbsTables.find((t) => t.name === "users")!.columns,
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

  const { info } = table;
  const ruleWasChanged =
    JSON.stringify(tableRules[editedRuleType]) ===
    JSON.stringify(localRules[editedRuleType]);
  return (
    <Popup
      title={
        <FlexRow className="gap-p5 ai-start">
          <Icon
            className="text-2"
            path={
              info.isFileTable ? mdiFile
              : info.isView ?
                mdiTableEye
              : mdiTable
            }
          />
          <FlexCol className="gap-p5">
            <div>{table.name}</div>
            {table.info.isFileTable && (
              <div className="font-14 text-2">
                File metadata is stored in this table
              </div>
            )}
          </FlexCol>
        </FlexRow>
      }
      positioning="right-panel"
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
        <MenuList
          className="m-auto"
          style={{ width: "100%", minWidth: "500px" }}
          variant="horizontal-tabs"
          items={getEntries(TABLE_RULE_LABELS).map(([key, { label }]) => ({
            key,
            label: label.mini,
            onPress: () => {
              setEditedRuleType(key);
            },
          }))}
          activeKey={editedRuleType}
        />
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
