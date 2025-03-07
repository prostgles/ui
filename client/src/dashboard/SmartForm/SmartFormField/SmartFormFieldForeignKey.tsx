import {
  useIsMounted,
  type DBHandlerClient,
} from "prostgles-client/dist/prostgles";
import {
  isDefined,
  isEmpty,
  type AnyObject,
  type ValidatedColumnInfo,
} from "prostgles-types";
import React, { useCallback, useEffect, useState } from "react";
import Select, { type FullOption } from "../../../components/Select/Select";
import { renderNull } from "./RenderValue";
import type { SmartFormFieldProps } from "./SmartFormField";
import { fetchForeignKeyOptions } from "./fetchForeignKeyOptions";

export type SmartFormFieldForeignKeyProps = Pick<
  SmartFormFieldProps,
  "rawValue" | "db" | "tables" | "row" | "tableName"
> & {
  column: ValidatedColumnInfo & {
    references: NonNullable<ValidatedColumnInfo["references"]>;
  };
  onChange: (newValue: string | number | null) => Promise<void>;
  readOnly: boolean;
};
export const SmartFormFieldForeignKey = ({
  column,
  db,
  onChange,
  tables,
  tableName,
  rawValue,
  row,
  readOnly,
}: SmartFormFieldForeignKeyProps) => {
  const [fullOptions, setFullOptions] = useState<FullOption[]>();
  const getuseIsMounted = useIsMounted();
  const onSearchOptions = useCallback(
    async (term: string) => {
      const options = await fetchForeignKeyOptions({
        column,
        db,
        tableName,
        tables,
        row,
        term,
      });
      if (!getuseIsMounted()) return;
      setFullOptions(options);
    },
    [column, db, tableName, tables, row, getuseIsMounted],
  );

  useEffect(() => {
    onSearchOptions("");
  }, [rawValue, onSearchOptions]);

  const valueStyle = {
    fontSize: "16px",
    fontWeight: 500,
    paddingLeft: "6px 0",
  };

  const selectedOption = fullOptions?.find((o) => o.key === rawValue);
  const valueNode = (
    <div className="text-ellipsis max-w-fit" style={valueStyle}>
      {renderNull(rawValue, {}, true) ?? rawValue}
    </div>
  );

  const paddingValue = isDefined(selectedOption?.subLabel) ? "6px" : "12px";
  const displayValue = (
    <div
      className={"flex-col gap-p5 min-w-0"}
      style={{
        padding: readOnly ? `${paddingValue} 0` : paddingValue,
        // border: "1px solid var(--b-default)"
      }}
    >
      {valueNode}
      {isDefined(selectedOption?.subLabel) && (
        <div
          className="SmartFormFieldForeignKey.subLabel ta-left text-ellipsis"
          style={{
            opacity: 0.75,
            fontSize: "14px",
            fontWeight: "normal",
            maxWidth: "300px",
          }}
        >
          {selectedOption.subLabel}
        </div>
      )}
    </div>
  );

  if (readOnly) {
    return displayValue;
  }

  return (
    <Select
      className="SmartFormFieldForeignKey FormField_Select noselect bg-color-0"
      variant="div"
      fullOptions={fullOptions ?? []}
      onSearch={onSearchOptions}
      onChange={onChange}
      value={rawValue}
      labelAsValue={true}
      btnProps={{
        children: displayValue,
        style: {
          padding: "0",
          justifyContent: "space-between",
          flex: 1,
        },
      }}
    />
  );
};
