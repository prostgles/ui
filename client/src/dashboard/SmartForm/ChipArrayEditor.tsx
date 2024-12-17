import { mdiPan } from "@mdi/js";
import type {
  PG_COLUMN_UDT_DATA_TYPE,
  TS_COLUMN_DATA_TYPES,
} from "prostgles-types";
import { _PG_date } from "prostgles-types";
import React, { useState } from "react";
import Chip from "../../components/Chip";
import { DraggableLI } from "../../components/DraggableLI";

type P = {
  inputType: string;
  /**
   * Used for styling and for adding new element default values
   */
  elemTsType: TS_COLUMN_DATA_TYPES;
  elemUdtName: PG_COLUMN_UDT_DATA_TYPE;
  values: string[]; //  TypeConversion[T][];
  onChange: (newValues: P["values"]) => void | Promise<void>;
};
export const ChipArrayEditor = ({
  inputType,
  elemTsType,
  elemUdtName,
  values,
  onChange,
}: P) => {
  const removeValue = (idx: number) => {
    const newVals = [...values] as typeof values;
    newVals.splice(idx, 1);
    onChange(newVals);
  };

  const renderedValues = values
    .map((value) => ({ value, isLastNew: false }))
    .concat([{ value: "", isLastNew: true }]);
  const [orderAge, setOrderAge] = useState(0);

  return (
    <div className={"ChipArrayEditor flex-row-wrap gap-p5 ptd-p25 ai-center"}>
      {renderedValues.map(({ value, isLastNew }, idx) => (
        //  Bad UX when selecting text

        <DraggableLI
          key={`${idx} ${orderAge}`}
          idx={idx}
          items={values}
          onReorder={(newVals) => {
            onChange(newVals);
            setOrderAge(Date.now());
          }}
          className="no-decor flex-row-wrap"
        >
          <InputChip
            key={idx}
            elemTsType={elemTsType}
            elemUdtName={elemUdtName}
            inputType={inputType}
            value={value}
            {...(isLastNew ?
              {
                placeholder: "add item...",
                onChange: (newValue) => {
                  onChange([...values, newValue]);
                },
              }
            : {
                onChange: (newValue) =>
                  onChange(
                    values.map((_v, _i) =>
                      _i === idx ? newValue : _v,
                    ) as typeof values,
                  ),
                onRemove: () => removeValue(idx),
              })}
          />
        </DraggableLI>
      ))}
    </div>
  );
};

type InputChipProps = Pick<P, "elemTsType" | "elemUdtName" | "inputType"> & {
  value: any;
  onChange: (newVal) => void;
  onRemove?: VoidFunction;
  placeholder?: string;
};
const InputChip = ({
  onChange,
  value,
  onRemove,
  placeholder,
  inputType,
  elemTsType,
  elemUdtName,
}: InputChipProps) => {
  const numberOfChars =
    Math.max(2, (((value as any)?.toString() || placeholder) ?? "").length) + 2;

  return (
    <Chip
      className="focus-border  b b-color text-color-0"
      style={{ background: "var(--input-bg-color)" }}
      onDelete={onRemove}
      leftIcon={{
        path: mdiPan,
        className: "show-on-parent-hover",
      }}
    >
      <input
        className="bg-transparent b b-b text-0"
        value={value}
        type={inputType}
        placeholder={placeholder}
        autoCorrect="off"
        autoCapitalize="off"
        style={{
          width: `${numberOfChars}ch`,
          minWidth: _PG_date.some((v) => v === elemUdtName) ? "250px" : "50px",
          maxWidth: "300px",

          minHeight: elemTsType === "boolean" ? "20px" : undefined,
        }}
        onChange={({ target: { value } }) => {
          onChange(value);
        }}
      />
    </Chip>
  );
};
