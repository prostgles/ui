import type { WorkspaceInsertModel } from "@common/DashboardTypes";
import { fromEntries } from "@common/utils";
import { statePrgl } from "@src/init/startProstgles";
import type { DBHandlerServer } from "prostgles-server";
import { getSerialisableError, isDefined } from "prostgles-types";
import type { McpCallContext } from "../../ProstglesMCPServerTypes";
import { getClientDBHandlersForChat } from "../getClientDBHandlersForChat";

export const validateCreateDashboards = async (
  prostglesWorkspaces: any[],
  { chat, connection_id, clientReq }: McpCallContext,
) => {
  if (!prostglesWorkspaces.length) {
    throw new Error("prostglesWorkspaces must have at least one workspace");
  }
  if (!statePrgl) {
    throw new Error("Prostgles state is not initialized");
  }

  const { clientDb: _clientDb } = await getClientDBHandlersForChat(
    { ...chat, connection_id },
    clientReq,
  );
  const clientDb = _clientDb as DBHandlerServer;

  const errors = (
    await Promise.all(
      (prostglesWorkspaces as WorkspaceInsertModel[]).map((workspace) => {
        return Promise.all(
          workspace.windows.map(async (window) => {
            if (window.type === "table") {
              const { table_name, columns, sort } = window;
              if (!table_name) {
                return `table_name is required for table windows. Problem found in workspace ${workspace.name}, window ${window.id}`;
              }

              if (!clientDb[table_name]?.find) {
                return `Table ${window.table_name} does not exist in the database or not allowed. Problem found in workspace ${workspace.name}, window ${window.id}`;
              }

              if (!columns?.length) {
                return `At least one column must be shown for table windows. Problem found in workspace ${workspace.name}, window ${window.id}`;
              }

              const select: Record<string, any> = {};
              columns.forEach(({ name, nested }) => {
                if (!name) {
                  return `Column name is required for table windows. Problem found in workspace ${workspace.name}, window ${window.id}`;
                }

                if (nested) {
                  select[name] = {
                    [nested.joinType === "inner" ? "$innerJoin" : "$leftJoin"]:
                      nested.path,
                    select: fromEntries(
                      ("columns" in nested ?
                        nested.columns.map((c) => c.name)
                      : [nested.chart.dateCol]
                      ).map((colName) => [colName, 1]),
                    ),
                  };
                } else {
                  select[name] = 1;
                }
              });

              const orderBy = sort
                ?.map((s) => {
                  const nestedCol = columns.find(
                    (c) => c.name === s.key && c.nested,
                  );
                  if (nestedCol) {
                    return {
                      ...s,
                      key: `${s.key}.value`,
                    };
                  }
                  return s;
                })
                .filter(isDefined);

              try {
                await clientDb[table_name].find(
                  {},
                  { select, limit: 0, orderBy },
                );
              } catch (e) {
                return `Failed to query table ${window.table_name}. Problem found in workspace ${workspace.name}, window ${window.id}. Error: ${JSON.stringify(getSerialisableError(e))}`;
              }
            } else if (window.type === "map" || window.type === "timechart") {
              const { layers } = window;
              if (!layers.length) {
                return `At least one layer is required for map windows. Problem found in workspace ${workspace.name}, window ${window.id}`;
              }

              return await Promise.all(
                layers.map(async (layer, index) => {
                  if (layer.type === "local-table") {
                    const { table_name, joinPath, filter } = layer;
                    const chartCols =
                      "geoColumn" in layer ?
                        [layer.geoColumn]
                      : [
                          layer.dateColumn,
                          layer.groupByColumn,
                          typeof layer.yAxis !== "string" ?
                            layer.yAxis.column
                          : undefined,
                        ].filter(isDefined);
                    if (!table_name) {
                      return `table_name is required for local-table layers. Problem found in workspace ${workspace.name}, window ${window.id}, layer index ${index}`;
                    }

                    if (!clientDb[table_name]?.find) {
                      return `Table ${table_name} does not exist in the database or not allowed. Problem found in workspace ${workspace.name}, window ${window.id}, layer index ${index}`;
                    }

                    if (!chartCols.length) {
                      return `At least one chart column is required for local-table layers. Problem found in workspace ${workspace.name}, window ${window.id}, layer index ${index}`;
                    }

                    try {
                      const parseColumnFilter = (
                        f: NonNullable<typeof filter>[number],
                      ): any => {
                        return (
                          "$filter" in f ? f
                          : "fieldName" in f ?
                            {
                              [f.fieldName]: { [f.type]: f.value },
                            }
                          : {
                              [Object.keys(f)[0]!]: {
                                path: Object.values(f)[0]!.path,
                                filter: parseColumnFilter(
                                  Object.values(f)[0]!.filter,
                                ),
                              },
                            }
                        );
                      };
                      const columnSelect = fromEntries(
                        chartCols.map((col) => [col, 1] as const),
                      );
                      await clientDb[table_name].find(
                        {
                          $and: filter?.map(parseColumnFilter) ?? [],
                        },
                        {
                          select:
                            !joinPath ? columnSelect : (
                              {
                                [joinPath.at(-1)!.table]: {
                                  $leftJoin: joinPath,
                                  select: columnSelect,
                                },
                              }
                            ),
                          limit: 0,
                        },
                      );
                    } catch (e) {
                      return `Failed to query table ${table_name} for local-table layer. Problem found in workspace ${workspace.name}, window ${window.id}, layer index ${index}. Error: ${JSON.stringify(getSerialisableError(e))}`;
                    }
                  }
                }),
              );
            } else if (window.type === "barchart") {
              const { labelColumn, numericAxis } = window;

              if ("table_name" in window) {
                const { table_name } = window;
                if (!clientDb[table_name]?.find) {
                  return `Table ${table_name} does not exist in the database or not allowed. Problem found in workspace ${workspace.name}, window ${window.id}`;
                }

                try {
                  await clientDb[table_name].find(
                    {},
                    {
                      select: {
                        [numericAxis.column]:
                          numericAxis.joinPath ?
                            {
                              $leftJoin: numericAxis.joinPath,
                              select: { [numericAxis.column]: 1 },
                            }
                          : 1,
                        [labelColumn]: 1,
                      },
                      limit: 0,
                    },
                  );
                } catch (e) {
                  return `Failed to query table ${table_name} for barchart window. Problem found in workspace ${workspace.name}, window ${window.id}. Error: ${JSON.stringify(getSerialisableError(e))}`;
                }
              }
            }
          }),
        );
      }),
    )
  )
    .flat()
    .flat()
    .filter(isDefined);

  if (errors.length) {
    throw errors.join("\n");
  }

  return "Done";
};
