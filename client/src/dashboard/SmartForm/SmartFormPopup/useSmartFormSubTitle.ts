import { sliceText } from "@common/utils";
import {
  type AnyObject,
  getKeys,
  type ValidatedColumnInfo,
} from "prostgles-types";
import { useMemo } from "react";

export const useSmartFormSubTitle = ({
  displayedColumns,
  rowFilterObj,
}: {
  displayedColumns: Pick<
    ValidatedColumnInfo,
    "name" | "is_pkey" | "references"
  >[];
  rowFilterObj: AnyObject | undefined;
}) => {
  const { subTitle } = useMemo(() => {
    const filterKeys =
      rowFilterObj && "$and" in rowFilterObj ?
        rowFilterObj.$and.flatMap((f) => getKeys(f))
      : getKeys(rowFilterObj ?? {});
    /** Do not show subTitle rowFilter if it's primary key and shows in columns */
    const knownJoinColumns = displayedColumns
      .filter((c) => c.is_pkey || c.references)
      .map((c) => c.name);
    const subTitle =
      rowFilterObj ?
        filterKeys.every((col) => knownJoinColumns.includes(col)) ?
          undefined
        : sliceText(
            " (" +
              Object.entries(rowFilterObj)
                .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                .join(" AND ") +
              ")",
            100,
          )
      : "";
    return { subTitle };
  }, [displayedColumns, rowFilterObj]);
  return { subTitle };
};
