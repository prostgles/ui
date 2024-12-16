import type { ColType } from "../../../../../../commonTypes/utils";
import { getColumnSuggestionLabel } from "../../SQLEditorSuggestions";
import { asSQL } from "../KEYWORDS";
import {
  getKind,
  type ParsedSQLSuggestion,
  type SQLMatchContext,
} from "../registerSuggestions";
import { getTableExpressionReturnType } from "./getQueryReturnType";
import {
  getTabularExpressions,
  type TabularExpression,
} from "./getTabularExpressions";

export type GetTableExpressionSuggestionsArgs = Pick<
  SQLMatchContext,
  "ss" | "sql"
> & {
  cb: SQLMatchContext["cb"];
  parentCb?: SQLMatchContext["cb"];
};

export const getTableExpressionSuggestions = async (
  args: GetTableExpressionSuggestionsArgs,
  require: "table" | "columns",
  onlyCurrentBlock = false,
): Promise<{
  columns: ParsedSQLSuggestion[];
  tables: ParsedSQLSuggestion[];
  tablesWithAliasInfo: (TabularExpression & {
    s: ParsedSQLSuggestion;
  })[];
  columnsWithAliasInfo: (TabularExpression & {
    s: ParsedSQLSuggestion;
  })[];
}> => {
  const isWith = args.cb.ftoken?.textLC === "with";
  const cannotSuggestTableSubqueries =
    isWith && require === "table" && args.cb.ltoken?.textLC === "join";
  let expressions = getTabularExpressions(
    args,
    require,
    onlyCurrentBlock,
  ).filter((e) => {
    /** Cannot join to aliased subqueries */
    if (cannotSuggestTableSubqueries) {
      return e.kwd === "as" || e.type === "tableOrView";
    }
    return true;
  });

  /**
   * Exclude columns from CTEs. Only select statement columns allowed */
  if (
    isWith &&
    require === "columns" &&
    args.cb.tokens.some((t) => !t.nestingId && t.textLC === "from")
  ) {
    expressions = expressions.filter((e) => e.kwd !== "as");
  }

  const columnsWithAliasInfo: (TabularExpression & {
    s: ParsedSQLSuggestion;
  })[] = [];
  const tablesWithAliasInfo: (TabularExpression & {
    s: ParsedSQLSuggestion;
  })[] = [];

  const getColumnSuggestion = (
    cs:
      | { type: "s"; s: ParsedSQLSuggestion }
      | { type: "col"; colType: ColType },
    tableAlias?: string,
    isCteAlias = false,
  ): Pick<
    ParsedSQLSuggestion,
    | "label"
    | "sortText"
    | "insertText"
    | "name"
    | "filterText"
    | "escapedIdentifier"
  > => {
    const c = cs.type === "s" ? cs.s.colInfo! : cs.colType;
    const colName =
      cs.type === "s" ?
        cs.s.escapedIdentifier!
      : cs.colType.escaped_column_name;

    const prevText = args.cb.prevText.trim();
    const hasNoAlias = cs.type === "s" && cs.s.escapedParentName === tableAlias;
    const endsWithThisAlias = tableAlias && prevText.endsWith(`${tableAlias}.`);
    const label =
      tableAlias && !hasNoAlias ? `${tableAlias}.${colName}` : colName;
    const insertText =
      isCteAlias || endsWithThisAlias || hasNoAlias ? colName : label;
    return {
      name: label,
      label: getColumnSuggestionLabel(
        { name: colName, ...c },
        tableAlias ?? (cs.type === "s" ? cs.s.tablesInfo!.name : ""),
      ),
      insertText,
      filterText: colName,
      escapedIdentifier: colName,
      sortText: "-1",
    };
  };

  for await (const e of expressions) {
    if (e.type === "tableOrView") {
      tablesWithAliasInfo.push({ ...e, s: e.table });
      columnsWithAliasInfo.push(
        ...e.columns.map((s) => ({
          ...e,
          s: { ...s, ...getColumnSuggestion({ type: "s", s }, e.alias) },
          alias: e.alias ?? "",
        })),
      );
      continue;
    }

    if (!args.sql) continue;
    const { colTypes } = await getTableExpressionReturnType(
      e.getQuery(),
      args.sql,
    );
    if (!colTypes) continue;
    const colTypesWithDefs = colTypes.map((c) => {
      return {
        ...c,
        column_name: c.escaped_column_name,
        definition: `${c.escaped_column_name} ${c.data_type}`,
      };
    });
    if (e.alias) {
      const s: ParsedSQLSuggestion = {
        kind: getKind("table"),
        documentation: {
          value:
            `**Expression**\n\n` +
            asSQL(
              `${e.alias}(\n` +
                colTypesWithDefs.map((c) => "  " + c.definition).join(", \n") +
                "\n)",
            ),
        },
        insertText: e.alias,
        label: e.alias,
        name: e.alias,
        range: undefined as any,
        escapedIdentifier: e.alias,
        type: "table",
        sortText: "-1",
        schema: colTypes[0]?.schema,
        tablesInfo: {
          escaped_identifiers: [e.alias],
          // identifiers: [expression.alias],
          schema: "public",
          cols: colTypes.map((c) => ({
            ...c,
            cConstraint: undefined,
            character_maximum_length: 0,
            data_type: c.data_type,
            udt_name: c.udt_name,
            name: c.escaped_column_name,
            comment: "",
            definition: "",
            escaped_identifier: c.escaped_column_name,
            has_default: false,
            nullable: false,
            numeric_precision: 0,
            numeric_scale: 0,
            ordinal_position: 0,
            column_default: "",
          })),
          comment: "",
          escaped_identifier: e.alias,
          escaped_name: e.alias,
          is_view: true,
          name: e.alias,
          oid: 0,
          relkind: "v",
          view_definition: undefined,
        },
      };
      tablesWithAliasInfo.push({ ...e, s });
    }

    const tAlias = e.alias ?? e.cteAlias;
    const tableAliasHeader = !tAlias ? "" : `**${tAlias}**\n\n`;
    columnsWithAliasInfo.push(
      ...colTypesWithDefs.map((c) => {
        const s: ParsedSQLSuggestion = {
          kind: getKind("column"),
          documentation: { value: tableAliasHeader + asSQL(c.definition) },
          ...getColumnSuggestion(
            { type: "col", colType: c },
            e.alias,
            e.type === "subquery" && e.kwd === "as",
          ),
          range: undefined as any,
          schema: c.schema,
          colInfo: {
            cConstraint: undefined,
            data_type: c.data_type,
            udt_name: c.udt_name,
            name: c.escaped_column_name,
            comment: "",
            character_maximum_length: 0,
            definition: "",
            escaped_identifier: c.escaped_column_name,
            has_default: false,
            nullable: false,
            numeric_precision: 0,
            numeric_scale: 0,
            ordinal_position: 0,
            column_default: "",
          },
          parentName: e.alias ?? "",
          escapedParentName: e.alias ?? "",
          type: "column",
          sortText: "-1",
        };

        return {
          s,
          ...e,
          alias: e.alias ?? "",
        };
      }),
    );
  }

  const columns = columnsWithAliasInfo.map(({ s }) => s);

  const tablesSuggestions = tablesWithAliasInfo.map((t) => t.s);
  return {
    columns,
    tables: tablesSuggestions,
    tablesWithAliasInfo,
    columnsWithAliasInfo: columnsWithAliasInfo,
  };
};
