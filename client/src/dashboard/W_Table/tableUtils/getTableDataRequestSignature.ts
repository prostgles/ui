import type { AnyObject } from "prostgles-types";
export const getTableDataRequestSignature = (
  args:
    | {
        select?: any;
        filter?: AnyObject;
        having?: AnyObject;
        barchartVals?: AnyObject;
        joinFilter?: AnyObject;
        externalFilters?: any;
        orderBy?: any;
        limit?: number | null;
        offset?: number;
      }
    | { sql: string },
  dataAge: number,
  dependencies: any[] = [],
) => {
  const argKeyObj: typeof args & { dataAge: number; dependencies: any[] } = {
    ...args,
    dataAge,
    dependencies,
  };
  const sigData = {};
  Object.keys(argKeyObj)
    .sort()
    .forEach((key) => {
      sigData[key] = argKeyObj[key];
    });

  return JSON.stringify(sigData);
};
