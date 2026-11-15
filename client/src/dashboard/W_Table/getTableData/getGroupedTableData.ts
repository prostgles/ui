import type { TableHandlerClient } from "prostgles-client";
import type { AnyObject, SelectParams } from "prostgles-types";
import { pickKeys } from "prostgles-types";

export const getGroupedTableData = async (
  find: TableHandlerClient["find"] | undefined,
  groups: unknown[] | undefined,
  groupColumn: string | undefined,
  filter: AnyObject,
  params: SelectParams & { limit: number; offset: number },
) => {
  if (!find || !groups || !groupColumn) return undefined;
  const pages = await Promise.all(
    groups.map(async (groupValue) => {
      const groupFilter = { $and: [filter, { [groupColumn]: groupValue }] };
      const rows = await find(groupFilter, params);
      return { filter: groupFilter, rows };
    }),
  );
  return {
    rows: pages.flatMap(({ rows }) => rows),
    fullPages: pages.filter(({ rows }) => rows.length === params.limit),
    groupsComplete: groups.length < GROUP_LIMIT,
  };
};

export const getGroupedNextPage = async (
  find: TableHandlerClient["find"] | undefined,
  pages: Awaited<ReturnType<typeof getGroupedTableData>>,
  params: SelectParams & { limit: number; offset: number },
) => {
  if (!find || !pages) return undefined;
  const nextPages = await Promise.all(
    pages.fullPages.map(({ filter }) =>
      find(filter, {
        ...pickKeys(params, ["select", "having"]),
        limit: 1,
        offset: params.offset + params.limit,
      }),
    ),
  );
  return nextPages.some((rows) => rows.length > 0);
};

export const GROUP_LIMIT = 1000;
