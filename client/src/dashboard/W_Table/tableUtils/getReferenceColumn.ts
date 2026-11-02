import type {
  ColumnConfig,
  ColumnConfigNested,
  ColumnConfigWithInfo,
} from "@common/ColumnConfig/ColumnConfig";
import type { DBSchemaTableWithRenderInfo } from "../../Dashboard/getTables";

/** Compose a table's reference display using an ordinary linked column. */
export const getReferenceColumn = (
  column: ColumnConfig & Pick<ColumnConfigWithInfo, "info">,
  tables: DBSchemaTableWithRenderInfo[],
  name: string,
): ColumnConfigNested | undefined => {
  if (column.nested || column.computedConfig || column.format) return;
  const defaultComponent = column.info?.defaultRenderAs?.params.component;
  if (
    defaultComponent &&
    defaultComponent !== "File" &&
    defaultComponent !== "FileAnnotation"
  ) {
    return;
  }
  const references = column.info?.references;
  const reference = references?.length === 1 ? references[0] : undefined;
  const table = tables.find((table) => table.name === reference?.ftable);
  if (defaultComponent && !table?.referenceDisplay) return;
  const options = getReferenceDisplay(table);
  if (!table || !reference || !options?.columns.length) return;
  /* An unavailable display field must not make the parent table query fail. */
  if (
    options.columns.some(
      ({ name }) =>
        !table.columns.some((column) => column.name === name && column.select),
    )
  )
    return;

  const columns = options.columns.map(({ name, format }) => {
    const targetColumn = table.columns.find((column) => column.name === name)!;
    /* Stop automatic reference displays from recursively following relationships. */
    const defaultFormat =
      (
        targetColumn.references?.some(({ ftable }) =>
          tables.some(
            (table) =>
              table.name === ftable &&
              getReferenceDisplay(table)?.columns.length,
          ),
        )
      ) ?
        { type: "NONE" as const }
      : undefined;
    return {
      name,
      show: true,
      format: format ?? targetColumn.renderAs ?? defaultFormat,
      display:
        options.display?.type !== "values" ?
          ("drillable-records" as const)
        : undefined,
    };
  });
  return {
    name,
    label: column.label ?? column.info?.label ?? column.name,
    show: column.show,
    infoLevel: column.infoLevel,
    idx: column.idx,
    width: column.width,
    display:
      options.display?.type !== "values" ? "drillable-records" : undefined,
    nested: {
      fallbackColumn: column.name,
      fallbackOnEmpty: !table.referenceDisplay || undefined,
      path: [
        {
          table: table.name,
          on: [
            Object.fromEntries(
              reference.cols.map((name, index) => [
                name,
                reference.fcols[index]!,
              ]),
            ),
          ],
        },
      ],
      columns,
      display:
        options.display?.type === "values" ?
          options.display
        : { type: "values", labels: "none" },
      joinType: "left",
      limit: 1,
    },
  };
};

const getReferenceDisplay = (
  table: DBSchemaTableWithRenderInfo | undefined,
): DBSchemaTableWithRenderInfo["referenceDisplay"] =>
  table?.referenceDisplay ??
  (table?.card?.headerColumn ?
    { columns: [{ name: table.card.headerColumn }] }
  : undefined);
