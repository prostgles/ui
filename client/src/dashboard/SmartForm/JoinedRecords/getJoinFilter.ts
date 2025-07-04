import type {
  DetailedFilterBase,
  SimpleFilter,
  SmartGroupFilter,
} from "../../../../../commonTypes/filterUtils";
import { isDefined } from "../../../utils";

export const getJoinFilter = function (
  path: string[],
  tableName: string,
  rowFilter: DetailedFilterBase[] = [],
  opts?: Pick<SimpleFilter, "minimised" | "disabled">,
): SmartGroupFilter {
  const f: SmartGroupFilter = rowFilter.map(({ fieldName, type, value }) => {
    const filter = {
      fieldName,
      value,
      type,
      ...opts,
    };

    /** Why hide self joins? */
    // if(path.at(-1) === tableName){
    //   return filter;
    // }

    return {
      type: "$existsJoined",
      path: [...path.slice(0, -1), tableName].filter(isDefined),
      filter,
      ...opts,
    };
  });
  return f;
};
