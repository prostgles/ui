import { mdiFilterPlus } from "@mdi/js";
import type { DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { ValidatedColumnInfo } from "prostgles-types";
import { _PG_date, _PG_numbers } from "prostgles-types";
import React, { useState } from "react";
import type {
  FilterType,
  JoinedFilter,
  SimpleFilter,
  SmartGroupFilter,
} from "../../../../commonTypes/filterUtils";
import type { BtnProps } from "../../components/Btn";
import Btn from "../../components/Btn";
import Popup from "../../components/Popup/Popup";
import SearchList from "../../components/SearchList/SearchList";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { JoinV2 } from "../Dashboard/dashboardUtils";
import { getColumnDataColor } from "../SmartForm/SmartFormField/SmartFormField";
import { AddJoinFilter } from "./AddJoinFilter";
import { getFilterableCols } from "./SmartSearch/SmartSearch";
import type { ColumnConfig } from "../W_Table/ColumnMenu/ColumnMenu";
import { isDefined } from "../../utils";
import { getComputedColumnSelect } from "../W_Table/tableUtils/getTableSelect";
import { getJoinPaths } from "../W_Table/tableUtils/getJoinPaths";
import { FlexRow } from "../../components/Flex";
import { SwitchToggle } from "../../components/SwitchToggle";
import { getJoinPathLabel } from "../W_Table/ColumnMenu/JoinPathSelectorV2";
import { getDefaultAgeFilter } from "./AgeFilter";

export type SmartAddFilterProps = {
  db: DBHandlerClient;
  tableName: string;
  tables: CommonWindowProps["tables"];
  selectedColumns: ColumnConfig[] | undefined;
  onChange: (
    filter: SmartGroupFilter,
    addedFilter: SimpleFilter,
    isAggregate: boolean,
  ) => void;
  detailedFilter?: SmartGroupFilter;
  className?: string;
  style?: React.CSSProperties;
  filterFields?: string[];
  variant?: "full";
  defaultType?: FilterType;
  btnProps?: BtnProps;
  itemName?: "filter" | "condition";
};

export const SmartAddFilter = (props: SmartAddFilterProps) => {
  const [addFilter, setAddFilter] = useState<{
    fieldName?: string;
    type?: SimpleFilter["type"];
  }>();
  const [joinOpts, setJoinOpts] = useState<{
    path: JoinV2[];
    type: JoinedFilter["type"];
  }>();
  const [popupAnchor, setPopupAnchor] = useState<HTMLElement>();
  const {
    tableName,
    onChange,
    detailedFilter = [],
    className = "",
    style = {},
    tables,
    filterFields,
    defaultType,
    btnProps,
    itemName = "filter",
    variant,
    selectedColumns = [],
  } = props;

  const [includeLinkedColumns, setIncludeLinkedColumns] = useState(false);
  const isCategorical = (
    col: Pick<ValidatedColumnInfo, "tsDataType" | "references" | "udt_name">,
  ) =>
    Boolean(
      col.references?.length ||
        ![..._PG_date, ..._PG_numbers].includes(col.udt_name as any),
    );
  const lastPathItem = joinOpts?.path.at(-1);
  const currentTable = lastPathItem?.tableName ?? tableName;
  const filterableTableColumns = getFilterableCols(
    tables.find((t) => t.name === currentTable)?.columns ?? [],
  ).filter((c) => c.filter && (!filterFields || filterFields.includes(c.name)));
  const joinableTables = tables.filter(
    (t) => getFilterableCols(t.columns).length,
  );
  if (!filterableTableColumns.length && !joinableTables.length) {
    return null;
  }
  const joinColumns =
    !includeLinkedColumns ?
      []
    : getJoinPaths(tableName, tables).flatMap((joinPath, i) => {
        const { table, path } = joinPath;
        const { label, labels } = getJoinPathLabel(joinPath, {
          tableName,
          tables,
        });
        return table.columns.flatMap((jc, idx) => {
          return {
            key: `${joinPath.pathStr}.${jc.name}`,
            ranking: Number(`2.${labels.length}`),
            label: `${table.name}.${jc.name}`,
            subLabel: path.length > 1 ? label : undefined,
            references: jc.references,
            name: jc.name,
            data_type: jc.tsDataType,
            udt_name: jc.udt_name,
            tsDataType: jc.tsDataType,
            is_pkey: false,
            computedConfig: undefined,
            joinInfo: { ...joinPath, column: jc },
          };
        });
      });

  const columns = [
    ...selectedColumns
      .map((c) => {
        const { computedConfig } = c;
        if (!computedConfig) return undefined;
        const { tsDataType, udt_name } = computedConfig.funcDef.outType;
        return {
          key: c.name,
          ranking: 0,
          name: c.name,
          label: c.name,
          data_type: tsDataType,
          subLabel: undefined,
          udt_name,
          tsDataType,
          is_pkey: false,
          computedConfig: c.computedConfig,
          joinInfo: undefined,
        };
      })
      .filter(isDefined),
    ...filterableTableColumns.map((c, i) => ({
      ...c,
      key: c.name,
      ranking: 1,
      label: c.name,
      subLabel: undefined,
      computedConfig: undefined,
      joinInfo: undefined,
    })),
    ...joinColumns,
  ];
  let popup;

  const resetState = () => {
    setAddFilter(undefined);
    setJoinOpts(undefined);
  };

  if (addFilter) {
    const onAddColumnFilter = (c: (typeof columns)[number]) => {
      const fieldName = c.name;
      const isGeo = c.udt_name.startsWith("geo");
      const joinPath =
        c.joinInfo?.path ??
        joinOpts?.path.map((j) => {
          const onObj = j.on.map((c) => Object.fromEntries(c));
          return { table: j.tableName, on: onObj };
        });
      const joinType =
        (joinOpts?.type ?? c.joinInfo) ? "$existsJoined" : undefined;

      const type =
        isGeo ? "$ST_DWithin"
        : _PG_numbers.includes(c.udt_name as any) && !c.is_pkey ? "$between"
        : (defaultType ??
          (joinPath ? "not null"
          : isCategorical(c) ? "$in"
          : "$between"));
      const innerFilter: SimpleFilter =
        _PG_date.includes(c.udt_name as any) ?
          getDefaultAgeFilter(fieldName, "$ageNow")
        : {
            fieldName,
            type,
            value: [],
            disabled: true,
            complexFilter:
              c.computedConfig ?
                {
                  type: "$filter",
                  leftExpression: getComputedColumnSelect(c.computedConfig),
                }
              : undefined,
          };

      const newFilter: SimpleFilter =
        joinPath && joinType ?
          {
            type: joinType,
            path: joinPath,
            filter: innerFilter,
            disabled: true,
          }
        : innerFilter;

      onChange(
        [...detailedFilter, newFilter],
        newFilter,
        c.computedConfig?.funcDef.isAggregate ?? false,
      );

      resetState();
    };

    popup = (
      <Popup
        positioning="beneath-left"
        data-command="SmartAddFilter"
        clickCatchStyle={{ opacity: 0.3 }}
        anchorEl={popupAnchor}
        onClose={() => {
          resetState();
        }}
        contentStyle={{ padding: 0 }}
      >
        <FlexRow>
          {!joinOpts && (
            <SwitchToggle
              data-command="SmartAddFilter.toggleIncludeLinkedColumns"
              className="mx-p5"
              variant="row-reverse"
              label={{
                label: "Related/Linked columns",
                info: "Include columns from tables that can be joined (through existing constraints) to this table",
              }}
              checked={includeLinkedColumns}
              onChange={setIncludeLinkedColumns}
            />
          )}
          <AddJoinFilter
            tableName={tableName}
            tables={tables}
            disabledInfo={
              includeLinkedColumns ?
                `Must disable Related/Linked columns`
              : undefined
            }
            {...joinOpts}
            onChange={(jo) => {
              setIncludeLinkedColumns(false);
              setJoinOpts(jo);
            }}
          />
        </FlexRow>
        <div
          className={
            "min-s-0 " +
            (window.isMobileDevice ? " flex-col " : " flex-row ") +
            " "
          }
          style={{
            maxHeight: "90vh",
          }}
        >
          {!!columns.length && (
            <SearchList
              className="search-list-cols f-1"
              style={{ maxHeight: "unset" }}
              autoFocus={true}
              items={columns.map((c) => ({
                key: c.key,
                label: c.label,
                /**
                 * contentBottom used instead of subLabel to exclude
                 * content from search for better experience
                 */
                contentBottom: (
                  <div className="mt-p25 text-1">{c.subLabel}</div>
                ),
                ranking: c.ranking,
                contentRight: (
                  <div
                    style={{
                      color: getColumnDataColor(c),
                      fontWeight: 300,
                    }}
                  >
                    {c.udt_name.toUpperCase()}
                  </div>
                ),
                onPress: () => onAddColumnFilter(c),
              }))}
            />
          )}
        </div>
      </Popup>
    );
  }

  const title = `Add ${itemName}`;
  return (
    <>
      <Btn
        title={title}
        className={"shadow bg-color-0 " + className}
        style={{ borderRadius: "6px", ...style }}
        color="action"
        iconPath={mdiFilterPlus}
        onClick={(e) => {
          setPopupAnchor(e.currentTarget);
          setAddFilter({});
        }}
        children={variant === "full" ? title : undefined}
        data-command={"SmartAddFilter"}
        disabledInfo={!columns.length ? "No filterable columns" : ""}
        {...btnProps}
      />
      {popup}
    </>
  );
};
