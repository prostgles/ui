import { getFinalFilter } from "../../commonTypes/filterUtils";
import { isObject } from "prostgles-types";
 
export const getACFilter = (rule: any) => {
  if(isObject(rule) && rule.forcedFilterDetailed){
    const forcedFilterD = rule.forcedFilterDetailed
    const isAnd = "$and" in forcedFilterD;
    const filters = isAnd? forcedFilterD.$and : forcedFilterD.$or;
    return { [isAnd? "$and" : "$or"]: filters.map(getFinalFilter) };
  }
}