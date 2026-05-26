import type { DetailedFilter } from "@common/filterUtils";
import { FlexRow } from "@components/Flex";
import { includes, isEqual, omitKeys } from "prostgles-types";
import React, { useCallback, useMemo, useState } from "react";
import { ContextDataSelector } from "../AccessControl/ContextDataSelector";
import { FilterWrapper, type FilterWrapperProps } from "./FilterWrapper";
import type { BaseFilterProps } from "../SmartFilter/SmartFilter";
import { DetailedFilterBaseControlRouter } from "./DetailedFilterBaseControlRouter";
import { validateFilter } from "./validateFilter";

export type DetailedFilterBaseControlProps = BaseFilterProps &
  Pick<FilterWrapperProps, "rootFilter" | "selectedColumns" | "label"> & {
    hideToggle?: boolean;
    minimised?: boolean;
  };

export const DetailedFilterBaseControl = (
  props: DetailedFilterBaseControlProps,
) => {
  const {
    column,
    tables,
    onChange: propsOnChange,
    db,
    tableName,
    contextData,
    filter: propsFilter,
  } = props;

  const [error, setError] = useState<unknown>(undefined);
  /**
   * Disable invalid filters
   */
  const onChangeWithValidation = useCallback(
    async (_newFilter: DetailedFilter | undefined) => {
      let newFilter = _newFilter;
      let newError;
      if (newFilter) {
        const { hasError, error } = await validateFilter(newFilter, {
          db,
          tableName,
          column,
          tables,
        });
        newError = error;
        if (hasError) {
          newFilter = {
            ...newFilter,
            disabled: true,
          };
        }
      }
      if (!isEqual(error, newError)) {
        setError(newError);
      }
      propsOnChange(newFilter);
    },
    [propsOnChange, column, db, error, tableName, tables],
  );

  const onChange = onChangeWithValidation;

  const filter = useMemo(
    () => ({
      ...propsFilter,
      fieldName: propsFilter?.fieldName ?? column.name,
      type: propsFilter?.type ?? "=",
    }),
    [propsFilter, column.name],
  );

  const withContextSelector = useMemo(() => {
    if (!contextData) return;
    const ctxCols = contextData.flatMap((t) =>
      t.columns
        .filter((c) => c.tsDataType === column.tsDataType)
        .map((c) => ({
          id: t.name + "." + c.name,
          tableName: t.name,
          ...c,
        })),
    );
    if (
      ctxCols.length &&
      includes(
        ["$eq", "=", "$ne", "<>"] satisfies (typeof filter.type)[],
        filter.type,
      )
    ) {
      return { ctxCols, contextData };
    }
  }, [column.tsDataType, contextData, filter]);

  const filterProps = useMemo(
    () => ({
      ...props,
      onChange,
    }),
    [props, onChange],
  );

  return (
    <FilterWrapper error={error} {...filterProps} filter={filter}>
      {!withContextSelector ?
        <DetailedFilterBaseControlRouter {...filterProps} error={error} />
      : <FlexRow className={"gap-p5"}>
          {!propsFilter?.contextValue ?
            <DetailedFilterBaseControlRouter {...filterProps} error={error} />
          : null}
          <ContextDataSelector
            className=""
            value={propsFilter?.contextValue}
            column={column}
            contextData={withContextSelector.contextData}
            onChange={(contextValue) => {
              if (!contextValue) {
                void onChange(
                  omitKeys(
                    {
                      ...filter,
                      disabled: true,
                    },
                    ["contextValue"],
                  ),
                );
              } else {
                void onChange({
                  ...filter,
                  disabled: false,
                  contextValue,
                });
              }
            }}
          />
        </FlexRow>
      }
    </FilterWrapper>
  );
};
