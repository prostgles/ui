import { isObject } from "prostgles-types";
import React, { useMemo } from "react";
import type {
  FieldFilter,
  TableRules,
} from "../../../../../commonTypes/publishUtils";
import { parseFieldFilter } from "../../../../../commonTypes/publishUtils";
import { FlexCol } from "../../../components/Flex";
import { InfoRow } from "../../../components/InfoRow";
import { isDefined } from "../../../utils";
import type { DBSchemaTablesWJoins } from "../../Dashboard/dashboardUtils";
import type { TableInfoWithRules } from "./TablePermissionControls";

type FileTableAccessControlInfoProps = {
  table: DBSchemaTablesWJoins[number];
  tablesWithRules: TableInfoWithRules[];
  ruleType: keyof TableRules;
};
export const FileTableAccessControlInfo = (
  props: FileTableAccessControlInfoProps,
) => {
  const { refTables } = useFileTableRefTableRules(props);
  if (!refTables) return null;

  const ruleCols = refTables
    .map((t) => {
      const cols = Object.entries(t.colRules).filter(
        ([c, r]) => r[props.ruleType],
      );
      if (!cols.length) return undefined;

      return {
        tableName: t.name,
        cols: cols.map((c) => c[0]),
      };
    })
    .filter(isDefined);

  return (
    <FlexCol>
      <InfoRow color="info" variant="naked" iconPath="">
        <FlexCol className="gap-p5">
          <div>
            Access to the files is controlled through:
            <ul className="pl-1">
              <li>- access rules for the columns referencing this table</li>
              <li>- access rules for this table</li>
            </ul>
          </div>
          <div>
            Any allowed action on the referencing columns is permitted on the
            referenced file records
          </div>
          {ruleCols.length > 0 && (
            <>
              <div className="mt-1">
                <strong>{props.ruleType.toUpperCase()}</strong> is allowed on
                files{" "}
                {props.ruleType !== "insert" ?
                  "referenced by"
                : "that will be referenced by"}{" "}
                the permitted records from following tables and columns:
              </div>
              <ul className="pl-1">
                {ruleCols.map((t) => (
                  <li key={t.tableName} className="bold">
                    {t.tableName} ({t.cols})
                  </li>
                ))}
              </ul>
            </>
          )}
        </FlexCol>
      </InfoRow>
    </FlexCol>
  );
};

export const useFileTableRefTableRules = ({
  table,
  tablesWithRules,
}: {
  table: DBSchemaTablesWJoins[number] | undefined;
  tablesWithRules: TableInfoWithRules[];
}) => {
  const refTables = useMemo(
    () =>
      !table?.info.isFileTable ?
        undefined
      : tablesWithRules
          .map((t) => {
            const refs = t.columns.filter((c) =>
              c.references?.some((r) => r.ftable === t.info.fileTableName),
            );
            if (!t.rule || !refs.length) {
              return undefined;
            }
            return {
              ...t,
              rule: t.rule,
              refs,
            };
          })
          .filter(isDefined)
          .map((t) => {
            const r = t.rule;
            const getCols = (fieldFilter: FieldFilter) => {
              const fields = parseFieldFilter({
                columns: t.columns.map((c) => c.name),
                fieldFilter,
              });
              return t.refs.filter((c) => fields.includes(c.name));
            };

            const selectRefs =
              r.select === true ? t.refs
              : isObject(r.select) ? getCols(r.select.fields)
              : undefined;
            const insertRefs =
              r.insert === true ? t.refs
              : isObject(r.insert) ? getCols(r.insert.fields)
              : undefined;
            const deleteRefs = r.delete ? t.refs : undefined;
            const updateRefs =
              r.update === true ? t.refs
              : isObject(r.update) ? getCols(r.update.fields)
              : undefined;

            if (!selectRefs && !insertRefs && !deleteRefs && !updateRefs) {
              return undefined;
            }

            return {
              ...t,
              colRules: Object.fromEntries(
                Array.from(
                  new Set([
                    ...(selectRefs ?? []).map((c) => c.name),
                    ...(insertRefs ?? []).map((c) => c.name),
                    ...(deleteRefs ?? []).map((c) => c.name),
                    ...(updateRefs ?? []).map((c) => c.name),
                  ]),
                ).map((colName) => [
                  colName,
                  {
                    select: selectRefs?.some((r) => r.name === colName),
                    insert: insertRefs?.some((r) => r.name === colName),
                    delete: deleteRefs?.some((r) => r.name === colName),
                    update: updateRefs?.some((r) => r.name === colName),
                  },
                ]),
              ),
              selectRefs,
              insertRefs,
              deleteRefs,
              updateRefs,
            };
          })
          .filter(isDefined),
    [tablesWithRules, table],
  );

  return { refTables };
};
