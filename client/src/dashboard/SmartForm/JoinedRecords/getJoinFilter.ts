import type { SmartGroupFilter } from "../../../../../commonTypes/filterUtils";
import { isDefined } from "../../../utils";
import type { JoinedRecords } from "./JoinedRecords";

export const getJoinFilter = function (
  this: JoinedRecords,
  path: string[],
): SmartGroupFilter {
  const { tableName, rowFilter = [] } = this.props;
  const f: SmartGroupFilter = rowFilter.map(({ fieldName, type, value }) => {
    const filter = {
      fieldName,
      value,
      type,
      minimised: true,
    };

    /** Why hide self joins? */
    // if(path.at(-1) === tableName){
    //   return filter;
    // }

    return {
      type: "$existsJoined",
      path: [...path.slice(0, -1), tableName].filter(isDefined),
      filter,
      minimised: true,
    };
  });
  return f;
};
