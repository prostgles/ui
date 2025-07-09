import { mdiClose, mdiPlus } from "@mdi/js";
import type { JSONB } from "prostgles-types";
import React, { useState } from "react";
import Btn from "../Btn";
import { DraggableLI } from "../DraggableLI";
import Popup from "../Popup/Popup";
import { Section } from "../Section";
import type { JSONBSchemaCommonProps } from "./JSONBSchema";
import { JSONBSchema } from "./JSONBSchema";
import { classOverride } from "../Flex";

type Schema = JSONB.ArrayOf;
type P = JSONBSchemaCommonProps & {
  schema: Schema;
  onChange: (newValue: JSONB.GetType<Schema>) => void;
};

export const JSONBSchemaArrayMatch = (s: JSONB.JSONBSchema): s is Schema =>
  !!(s.arrayOf || s.arrayOfType);

export const JSONBSchemaArray = ({
  value,
  schema,
  onChange,
  nestingPath,
  ...oProps
}: P) => {
  const [newItem, setNewItem] = useState<{
    val: any;
    isComplete: boolean;
    anchorEl: HTMLElement;
  }>();
  const itemSchema =
    typeof schema.arrayOf === "string" ?
      { type: schema.arrayOf }
    : (schema.arrayOf ?? { type: schema.arrayOfType });

  const addNewItem = (nItem = newItem) => {
    if (!nItem) return;

    onChange([...(Array.isArray(value) ? value : []), nItem.val] as any);
    setNewItem(undefined);
  };

  const [orderAge, setOrderAge] = useState(0);

  return (
    <Section
      className="JSONBSchemaArray flex-col gap-p5 f-1"
      contentClassName="flex-col gap-p5 max-h-500 pl-1 o-auto"
      title={schema.title ?? "Items"}
      titleRightContent={
        <Btn
          title="Add new item"
          iconPath={mdiPlus}
          color="action"
          variant="faded"
          size="small"
          onClick={({ currentTarget }) => {
            setNewItem({
              isComplete: false,
              val: null,
              anchorEl: currentTarget,
            });
          }}
        />
      }
      open={true}
    >
      {/* <Label info={schema.description}>{schema.title}</Label> */}
      <div className="JSONBSchemaArray_ItemsList flex-col gap-1">
        {Array.isArray(value) &&
          value.map((item, itemIdx) => {
            const itemNestingPath = [...(nestingPath ?? []), itemIdx];
            const itemStyle = oProps.schemaStyles?.find(
              (ss) => ss.path.join() === itemNestingPath.join(),
            );
            return (
              <DraggableLI
                key={itemIdx + orderAge}
                className={classOverride(
                  "no-decor flex-row gap-1 trigger-hover hover-bg " +
                    (itemIdx ? "bt b-color " : ""),
                  itemStyle?.className,
                )}
                style={{
                  padding: ".5em",
                  ...itemStyle?.style,
                }}
                items={value}
                idx={itemIdx}
                onReorder={(newValue) => {
                  onChange(newValue as any);
                  setOrderAge(Date.now());
                }}
              >
                <div className="flex-row-wrap f-1 ">
                  <JSONBSchema
                    schema={{ ...itemSchema } as any}
                    value={item as any}
                    onChange={
                      ((newValue) => {
                        onChange(
                          newValue === undefined ?
                            (value as any).filter((_, i) => i !== itemIdx)
                          : (value.map((v, i) =>
                              i === itemIdx ? newValue : v,
                            ) as any),
                        );
                      }) as any
                    }
                    nestingPath={itemNestingPath}
                    {...oProps}
                  />
                </div>
                <Btn
                  color="danger"
                  variant="faded"
                  className="show-on-trigger-hover ml-auto as-start"
                  style={{
                    marginTop: "24px",
                  }}
                  title="Remove element"
                  iconPath={mdiClose}
                  onClick={() => {
                    onChange((value as any).filter((_, i) => i !== itemIdx));
                  }}
                />
              </DraggableLI>
            );
          })}
      </div>
      {newItem && (
        <Popup
          title={"Add new item"}
          anchorEl={newItem.anchorEl}
          positioning="beneath-left"
          clickCatchStyle={{ opacity: 1 }}
          onClose={() => setNewItem(undefined)}
          footerButtons={[
            {
              label: "Cancel",
              onClickClose: true,
            },
            {
              label: "Add item",
              color: "action",
              variant: "filled",
              disabledInfo:
                !newItem.isComplete ?
                  "Must fill all required data first"
                : undefined,
              onClick: () => addNewItem(),
            },
          ]}
        >
          <JSONBSchema
            schema={itemSchema as any}
            value={newItem.val}
            onChange={
              ((newValue) => {
                setNewItem({ ...newItem, val: newValue, isComplete: true });
                addNewItem({ ...newItem, val: newValue, isComplete: true });
              }) as any
            }
            {...oProps}
          />
        </Popup>
      )}
    </Section>
  );
};
