import { mdiPlus } from "@mdi/js";
import type { ValidatedColumnInfo } from "prostgles-types";
import React, { useEffect, useState } from "react";
import type {
  FilterType,
  SimpleFilter,
} from "../../../../commonTypes/filterUtils";
import Btn from "../../components/Btn";
import PopupMenu from "../../components/PopupMenu";
import Select from "../../components/Select/Select";

export const CONTEXT_FILTER_OPERANDS = [
  "=",
  "<>",
  ">=",
  "<=",
  ">",
  "<",
] as const;

type ContextFilterVal = {
  fieldName: string;
  objectPropertyName: string;
  type: (typeof CONTEXT_FILTER_OPERANDS)[number];
};

type ContextFilterProps = {
  columns: ValidatedColumnInfo[];
  contextCols: ValidatedColumnInfo[];
  onChange: (val: ContextFilterVal) => void;
  filter?: ContextFilterVal;
};

export const ContextFilter = ({
  columns,
  contextCols,
  onChange,
  filter,
}: ContextFilterProps) => {
  const [value, setValue] = useState<Partial<ContextFilterVal>>({
    ...filter,
    type: "=",
  });
  const col = columns.find((c) => c.name === value.fieldName);
  const ctxCol = contextCols.find((c) => c.name === value.objectPropertyName);

  useEffect(() => {
    const isNewOrUpdated =
      !filter || JSON.stringify(filter) !== JSON.stringify(value);
    const finalFilter: ContextFilterVal | undefined =
      isNewOrUpdated && col && ctxCol && col.tsDataType === ctxCol.tsDataType ?
        (value as ContextFilterVal)
      : undefined;
    if (finalFilter) {
      onChange(finalFilter);
    }
  }, [value, col, ctxCol, filter, onChange]);

  return (
    <div className="flex-col gap-1">
      <div className="flex-row gap-p5 ai-end">
        <Select
          label="Column"
          value={value.fieldName}
          fullOptions={columns
            .filter((c) =>
              contextCols.some((ctxCol) => ctxCol.tsDataType === c.tsDataType),
            )
            .map((c) => ({
              key: c.name,
              label: c.label,
              subLabel: c.data_type,
            }))}
          onChange={(fieldName) => setValue({ ...value, fieldName })}
        />
        {!!value.fieldName && (
          <>
            <Select
              options={CONTEXT_FILTER_OPERANDS}
              value={value.type}
              onChange={(type) => {
                setValue({ ...value, type });
              }}
            />
            <Select
              label="User field"
              value={value.objectPropertyName}
              fullOptions={contextCols.map((c) => ({
                key: c.name,
                label: `user.${c.label}`,
                subLabel: c.data_type,
              }))}
              onChange={(objectPropertyName) => {
                setValue({ ...value, objectPropertyName });
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

type AddContextFilterProps = Pick<
  ContextFilterProps,
  "columns" | "contextCols"
> & {
  onAdd: (newFilter: SimpleFilter) => void;
};

export const AddContextFilter = ({
  columns,
  contextCols,
  onAdd,
}: AddContextFilterProps) => {
  const [value, setValue] = useState<ContextFilterVal | void>();

  if (!contextCols.length) return <>No context columns</>;

  return (
    <PopupMenu
      button={
        <Btn size="small" className="shadow bg-color-0" iconPath={mdiPlus}>
          User filter
        </Btn>
      }
      positioning="beneath-left"
      clickCatchStyle={{ opacity: 0 }}
      render={(pClose) => (
        <div className="flex-col gap-2">
          <ContextFilter
            columns={columns}
            contextCols={contextCols}
            onChange={(f) => {
              setValue(f);
            }}
          />

          {!!value && (
            <Btn
              size="small"
              variant="filled"
              color="action"
              iconPath={mdiPlus}
              onClick={() => {
                onAdd({
                  type: value.type as FilterType,
                  fieldName: value.fieldName,
                  contextValue: {
                    objectName: "user",
                    objectPropertyName: value.objectPropertyName,
                  },
                });
                pClose();
              }}
            >
              Add
            </Btn>
          )}
        </div>
      )}
    />
  );
};
