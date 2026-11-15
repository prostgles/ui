import type { ActionColumnsParams } from "@common/actionColumn";
import type { ActionColumnValue } from "@common/createActionColumn";
import { hasCardFieldLists } from "@common/ColumnConfig/cardLayout";
import { getFunctionOptions } from "@common/functionOptions";
import {
  getActionFunctions,
  isDefined,
  type ServerFunctionHandler,
} from "prostgles-types";
import type { DBSchemaTableWithOptions } from "../../Dashboard/getTables";

export const getColumnConfigsWithDefaultActions = (
  table: DBSchemaTableWithOptions,
  methods: ServerFunctionHandler,
): Pick<DBSchemaTableWithOptions, "columnConfigs" | "card"> => {
  const { columnConfigs } = table;
  if (
    Object.values(columnConfigs ?? {}).some(
      ({ format }) =>
        format?.type === "Action" || format?.type === "ActionColumns",
    )
  ) {
    return { columnConfigs, card: table.card };
  }

  const storedActions = table.columns
    .map((column) => {
      const config = columnConfigs?.[column.name] ?? {};
      if (
        column.select &&
        !config.format &&
        !config.nested &&
        !config.computedConfig &&
        column.defaultRenderAs?.params.component === "ActionColumns"
      ) {
        const defaultValue = column.jsonbSchema?.defaultValue as
          ActionColumnValue | undefined;
        return {
          column,
          config,
          defaultValue,
          isJob: !!methods[defaultValue?.methodName ?? ""]?.jobControl,
        };
      }
    })
    .filter(isDefined);

  const functions = getActionFunctions(methods, table).filter(
    ({ methodName }) =>
      !getFunctionOptions(methods[methodName])?.showInTableHeader?.length,
  );
  const jobColumns = Array.from(
    new Set(
      functions.flatMap(({ methodName }) => {
        const job = methods[methodName]?.jobControl;
        return job ? [job.columnName] : [];
      }),
    ),
  );
  const actions: ActionColumnsParams["actions"] = [
    ...storedActions
      .filter(({ isJob }) => isJob)
      .map(({ column }) => ({ columnName: column.name })),
    ...jobColumns.map((methodsForJobColumn) => ({ methodsForJobColumn })),
    ...storedActions
      .filter(({ isJob }) => !isJob)
      .map(({ column }) => ({ columnName: column.name })),
    ...functions
      .filter(
        ({ methodName, argName }) =>
          !methods[methodName]?.jobControl &&
          !storedActions.some(
            ({ defaultValue }) =>
              defaultValue?.methodName === methodName &&
              (!defaultValue.argName || defaultValue.argName === argName),
          ),
      )
      .map(({ methodName, argName }) => ({ methodName, argName })),
  ];
  if (!actions.length) {
    return { columnConfigs, card: table.card };
  }
  const reservedNames = new Set([
    ...table.columns.map(({ name }) => name),
    ...Object.keys(columnConfigs ?? {}),
  ]);
  let name = "Actions";
  let suffix = 1;
  while (reservedNames.has(name)) {
    name = `Actions_${suffix++}`;
  }
  return {
    columnConfigs: {
      ...columnConfigs,
      ...Object.fromEntries(
        storedActions.map(({ column, config }) => [
          column.name,
          { show: false, ...config },
        ]),
      ),
      [name]: {
        label: "Actions",
        show: true,
        format: { type: "ActionColumns", params: { actions } },
      },
    },
    card:
      table.card && hasCardFieldLists(table.card) ?
        {
          ...table.card,
          summaryFields: [
            ...new Set([...(table.card.summaryFields ?? []), name]),
          ],
        }
      : table.card,
  };
};
