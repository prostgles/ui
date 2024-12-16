import React, { useState } from "react";
import type { CommonWindowProps } from "../../Dashboard/Dashboard";
import type { JoinV2 } from "../../Dashboard/dashboardUtils";
import { FlexCol } from "../../../components/Flex";
import Btn from "../../../components/Btn";
import { mdiPencil } from "@mdi/js";
import Popup from "../../../components/Popup/Popup";
import { SwitchToggle } from "../../../components/SwitchToggle";

type JoinPathItemProps = JoinV2 & {
  onChange: (newJoin: JoinV2) => void;
  prevTableName: string | undefined;
  tables: CommonWindowProps["tables"];
};

export const JoinPathItem = ({
  tableName,
  on: onValue,
  tables,
  prevTableName,
  onChange,
}: JoinPathItemProps) => {
  const on =
    tables
      .find((t) => t.name === prevTableName)
      ?.joinsV2.find((j) => j.tableName === tableName)?.on || [];
  const condition = getJoinPathConditionStr({ tableName, on: onValue });
  const [edit, setEdit] = useState<{ anchor: HTMLElement; on: JoinV2["on"] }>();
  const canChooseConditions = on.length > 1;

  return (
    <>
      <FlexCol className={"JoinPathItem relative gap-p25 f-0 "}>
        {canChooseConditions && (
          <Btn
            title="Choose join condition"
            style={{ position: "absolute", top: 0, right: 0 }}
            className="show-on-parent-hover"
            variant="faded"
            color="action"
            iconPath={mdiPencil}
            onClick={(e) => {
              setEdit({ anchor: e.currentTarget, on });
            }}
          />
        )}
        <div className="font-bold">{tableName}</div>
        <div
          style={{
            /* Maintain height for first item */
            height: "1rem",
            /* Give a visual que for the fact that this condition refers to this and prev table */
            marginLeft: "-10%",
          }}
        >
          {condition}
        </div>
      </FlexCol>
      {edit && (
        <Popup
          anchorEl={edit.anchor}
          title="Select join conditions"
          positioning="beneath-left"
          onClose={() => setEdit(undefined)}
          footerButtons={[
            {
              label: "Cancel",
              onClick: () => {
                onChange({ tableName, on: onValue });
                setEdit(undefined);
              },
            },
            {
              label: "Done",
              variant: "filled",
              color: "action",
              onClick: () => {
                setEdit(undefined);
              },
            },
          ]}
        >
          {on.map((condition, i) => {
            const conditionStr = getJoinPathConditionStr({
              tableName,
              on: [condition],
            });
            const checked = onValue.some(
              (condValue) =>
                getJoinPathConditionStr({ tableName, on: [condValue] }) ===
                conditionStr,
            );
            return (
              <React.Fragment key={conditionStr}>
                {i > 0 && <div>OR</div>}
                <SwitchToggle
                  className="p-1"
                  label={conditionStr}
                  checked={checked}
                  onChange={(newChecked) => {
                    const newOn =
                      newChecked ?
                        [...onValue, condition]
                      : onValue.filter(
                          (condValue) =>
                            getJoinPathConditionStr({
                              tableName,
                              on: [condValue],
                            }) !== conditionStr,
                        );
                    if (!newOn.length) return;
                    onChange({ tableName, on: newOn });
                  }}
                />
              </React.Fragment>
            );
          })}
        </Popup>
      )}
    </>
  );
};

export const getJoinPathConditionStr = (j: JoinV2) => {
  return j.on
    .map(
      (fieldPairs, i) =>
        "(" + fieldPairs.map(([f1, f2]) => `${f1} = ${f2}`).join(" AND ") + ")",
    )
    .join(" OR ");
};
