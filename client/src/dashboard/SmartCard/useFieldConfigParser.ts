import React from "react";
import type { ParsedFieldConfig, SmartCardProps } from "./SmartCard";
import { usePromise } from "prostgles-client";
import { getSmartCardColumns } from "./getSmartCardColumns";
import { getDefaultFieldConfig, parseFieldConfigs } from "./parseFieldConfigs";
import { isDefined } from "../../utils/utils";

export const useFieldConfigParser = (props: SmartCardProps) => {
  const {
    fieldConfigs: _fieldConfigs,
    tableName,
    db,
    columns: columnsFromProps,
    hideColumns,
    tables,
    excludeNulls,
    defaultData,
  } = props;

  const fetchedColumns = usePromise(async () => {
    if (columnsFromProps) return undefined;
    return await getSmartCardColumns({ tableName, db });
  }, [columnsFromProps, tableName, db]);
  const cardColumns = columnsFromProps ?? fetchedColumns;

  const displayedColumns =
    hideColumns ?
      cardColumns?.filter((c) => hideColumns.includes(c.name))
    : cardColumns;

  const fieldConfigs =
    parseFieldConfigs(_fieldConfigs, undefined, tables) ||
    getDefaultFieldConfig(displayedColumns);

  const fieldConfigsWithColumns = fieldConfigs
    .filter((fc) => !fc.hide)
    .map((fc: ParsedFieldConfig) => ({
      name: fc.name.toString(),
      col: displayedColumns?.find((c) => fc.name === c.name),
      fc,
    })) /** Do not render if has nulls and no render and excludeNulls is true  */
    .filter(
      ({ name, fc }) =>
        !fc.hideIf?.(defaultData[name], defaultData) &&
        (fc.render ||
          !excludeNulls ||
          (defaultData[name] !== null && isDefined(defaultData[name]))),
    );

  return (
    cardColumns && {
      cardColumns,
      fieldConfigsWithColumns,
    }
  );
};
