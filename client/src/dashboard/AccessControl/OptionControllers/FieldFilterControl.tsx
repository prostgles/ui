import React, { useCallback, useEffect, useMemo } from "react";
import type { ValidatedColumnInfo } from "prostgles-types";
import { isObject } from "prostgles-types";
import Select from "../../../components/Select/Select";
import { getKeys } from "../../SmartForm/SmartForm";
import ErrorComponent from "../../../components/ErrorComponent";
import type { FieldFilter } from "../../../../../commonTypes/publishUtils";
import { mdiFilter } from "@mdi/js";
import { Label } from "../../../components/Label";
import { FlexCol, FlexRow } from "../../../components/Flex";

type FieldFilterControlProps = {
  iconPath?: string;
  label: string;
  info?: React.ReactNode;
  value: FieldFilter;
  columns: ValidatedColumnInfo[];
  onChange: (val: FieldFilterControlProps["value"]) => any;
  expectAtLeastOne?: boolean;
  excluded?: {
    fields?: string[];
    message: string;
  };
  title?: React.ReactNode;
};

export const FieldFilterControl = ({
  value,
  columns,
  onChange,
  label,
  excluded,
  info,
  iconPath = mdiFilter,
  expectAtLeastOne = false,
  title,
}: FieldFilterControlProps) => {
  const fieldOpts = [
    {
      key: "only these fields",
      label: "Custom fields",
      ["data-command"]: "FieldFilterControl.type.custom",
    },
    {
      key: "all EXCEPT these fields",
      label: "All fields except",
      ["data-command"]: "FieldFilterControl.type.except",
    },
    {
      key: "all fields",
      label: "All fields",
      disabledInfo: excluded?.fields?.length ? excluded.message : undefined,
    },
  ] as const;

  const isExcept = isObject(value) && Object.values(value).some((v) => !v);
  const fieldOpt =
    value === "*" ? fieldOpts[2].key
    : isExcept ? fieldOpts[1].key
    : fieldOpts[0].key;

  const setFields = useCallback(
    (fields: string[] | true, include: boolean) => {
      const newFields =
        fields === true ? "*" : (
          fields
            .filter((f) => columns.some((c) => c.name === f))
            .reduce((a, v) => ({ ...a, [v]: include ? true : false }), {})
        );

      onChange(newFields);
    },
    [columns, onChange],
  );

  const fieldList = columns.map((c) => ({
    key: c.name,
    subLabel: c.udt_name,
    disabledInfo:
      excluded?.fields?.includes(c.name) ? excluded.message : undefined,
  }));
  const fields = useMemo(
    () =>
      Array.isArray(value) ? value
      : isObject(value) ? getKeys(value)
      : [],
    [value],
  );

  useEffect(() => {
    if (fieldList.some((f) => f.disabledInfo && fields.includes(f.key))) {
      setFields(
        fieldList.filter((f) => !f.disabledInfo).map((f) => f.key),
        true,
      );
    }
  }, [fields, fieldList, setFields]);

  const error = getError(value, columns, expectAtLeastOne);

  return (
    <FlexCol className="gap-0" data-command="FieldFilterControl">
      <FlexRow>
        <Label
          iconPath={iconPath}
          label={label}
          info={info}
          popupTitle={title}
        />
        <Select
          className="mr-p5"
          data-command="FieldFilterControl.type"
          fullOptions={fieldOpts}
          value={fieldOpt}
          onChange={(opt) => {
            if (opt === "all fields") {
              setFields(true, true);
            } else {
              setFields(
                fields.length ? fields : columns.map((c) => c.name),
                opt === fieldOpts[0].key,
              );
            }
          }}
        />
      </FlexRow>
      {(fieldOpt !== "all fields" || error) && (
        <FlexRow
          className="gap-0 p-1 ml-3"
          style={{ maxWidth: "min(800px, 100vw)" }}
        >
          {fieldOpt !== "all fields" && (
            <Select
              id="Select"
              data-command="FieldFilterControl.select"
              value={fields}
              fullOptions={fieldList}
              multiSelect={true}
              onChange={(fields) => {
                setFields(fields, !isExcept);
              }}
              variant={"chips-lg"}
            />
          )}

          {error && <ErrorComponent error={error} />}
        </FlexRow>
      )}
    </FlexCol>
  );
};

const getError = (
  v: FieldFilter,
  columns: ValidatedColumnInfo[],
  expectAtLeastOne = true,
) => {
  if (!v) return;
  if (isObject(v)) {
    const fields = v;
    const fieldKeys = getKeys(fields);
    if (!fieldKeys.length && expectAtLeastOne)
      return "Must select at least a field";

    const badCols = fieldKeys.filter(
      (fieldName) => !columns.some((c) => c.name === fieldName),
    );
    if (badCols.length) {
      return `Invalid/disallowed columns found: ${badCols}`;
    }

    const fieldVals = Object.values(fields);
    if (
      fieldVals.some((v) => v === true) &&
      fieldVals.some((v) => v === false)
    ) {
      return "Cannot combine included and excluded fields";
    }
  }
};
