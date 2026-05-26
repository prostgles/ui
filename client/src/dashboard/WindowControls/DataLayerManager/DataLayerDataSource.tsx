import { sliceText } from "@common/utils";
import Btn from "@components/Btn";
import { FlexCol, FlexRow } from "@components/Flex";
import { InfoRow } from "@components/InfoRow";
import Popup from "@components/Popup/Popup";
import {
  SearchList,
  type SvgIconName,
} from "@components/SearchList/SearchList";
import { mdiLinkPlus, mdiScript, mdiTable } from "@mdi/js";
import { usePrgl } from "@pages/ProjectConnection/PrglContextProvider";
import { isDefined, isEqual } from "prostgles-types";
import React, { useMemo, useState } from "react";
import { addChart } from "src/dashboard/Dashboard/addChart";
import { getChartCols } from "src/dashboard/W_Table/TableMenu/getChartCols";
import type { LinkSyncItem } from "../../Dashboard/dashboardUtils";
import { OSMLayerOptions } from "../OSMLayerOptions";
import { SQLChartLayerEditor } from "../SQLChartLayerEditor";
import type { ChartLinkOptions, DataLayerProps } from "./DataLayer";

export const DataLayerDataSource = (
  props: DataLayerProps & {
    hideDesc?: boolean;
  },
) => {
  const { myLinks, layer, w, getLinksAndWindows, hideDesc } = props;
  const [popupAnchor, setPopupAnchor] = useState<HTMLButtonElement>();

  const thisLink = myLinks.find((l) => l.id === layer.linkId);
  const linkOptions = thisLink?.options;
  if (
    !linkOptions ||
    (linkOptions.type !== "map" && linkOptions.type !== "timechart")
  ) {
    return null;
  }

  const { dataSource } = linkOptions;

  const tableName =
    props.layer.type === "table" ? props.layer.tableName
    : props.layer.type === "local-table" ? props.layer.localTableName
    : undefined;
  const joinPath =
    dataSource?.type === "table" ? dataSource.joinPath : undefined;
  const column =
    props.type === "map" ? props.layer.geomColumn : props.layer.dateColumn;
  const osmOrSQLQuery =
    dataSource?.type === "osm" ? dataSource.osmLayerQuery
    : dataSource?.type === "sql" ? dataSource.sql
    : undefined;

  const layerDesc = `${joinPath?.at(-1)?.table || tableName || sliceText(osmOrSQLQuery, 20)} (${column})`;

  const iconPath =
    dataSource?.type === "local-table" ? mdiTable
    : dataSource?.type === "table" ? mdiLinkPlus
    : mdiScript;

  if (dataSource?.type === "osm") {
    return <OSMLayerOptions link={thisLink} dataSource={dataSource} />;
  }

  return (
    <FlexRow className="DataLayerDataSource min-w-0 gap-p5">
      <Btn
        iconPath={iconPath}
        data-command={popupAnchor ? undefined : "DataLayerDataSourceInfo"}
        size="small"
        color="action"
        style={{ padding: 0, minHeight: 0, minWidth: 0 }}
        onClick={({ currentTarget }) => setPopupAnchor(currentTarget)}
      />
      {popupAnchor && (
        <Popup
          data-command="DataLayerDataSourceInfo"
          positioning="beneath-left"
          anchorEl={popupAnchor}
          contentClassName="ai-start ta-left p-1"
          onClose={() => setPopupAnchor(undefined)}
        >
          <DataLayerDataSourceInfo
            w={w}
            getLinksAndWindows={getLinksAndWindows}
            dataSource={dataSource}
            thisLink={thisLink}
            onClose={() => setPopupAnchor(undefined)}
          />
        </Popup>
      )}
      {!hideDesc && (
        <div className="text-ellipsis" title={layerDesc}>
          {layerDesc}
        </div>
      )}
    </FlexRow>
  );
};

const DataLayerDataSourceInfo = ({
  w,
  dataSource,
  thisLink,
  getLinksAndWindows,
  onClose,
}: {
  dataSource: Exclude<ChartLinkOptions["dataSource"], { type: "osm" }>;
  thisLink: LinkSyncItem;
  onClose: () => void;
} & Pick<DataLayerProps, "w" | "getLinksAndWindows">) => {
  const { tables, dbs } = usePrgl();
  const joinedChartCols = useMemo(() => {
    if (dataSource?.type !== "table") return;
    const parentTable = getLinksAndWindows()
      .windows.map((otherW) =>
        (
          [thisLink.w1_id, thisLink.w2_id].includes(otherW.id) &&
          otherW.type === "table"
        ) ?
          otherW
        : undefined,
      )
      .find(isDefined);
    if (!parentTable) return;
    const res = getChartCols({ type: "table", w: parentTable, tables });
    const otherGeoCols = res.geoCols
      .map((c) =>
        c.type === "joined" && !isEqual(dataSource.joinPath, c.path) ?
          c
        : undefined,
      )
      .filter(isDefined);
    const otherDateCols = res.dateCols
      .map((c) =>
        c.type === "joined" && !isEqual(dataSource.joinPath, c.path) ?
          c
        : undefined,
      )
      .filter(isDefined);
    return { otherGeoCols, otherDateCols, parentTable };
  }, [dataSource, getLinksAndWindows, tables, thisLink.w1_id, thisLink.w2_id]);

  if (dataSource?.type === "local-table") {
    return "Local table";
  }
  if (!dataSource || dataSource.type === "sql") {
    return <SQLChartLayerEditor link={thisLink} />;
  }

  const { joinPath, tableName } = dataSource;
  const thisLinkOpts = thisLink.options;
  const chartableColumns =
    thisLinkOpts.type === "map" ? joinedChartCols?.otherGeoCols
    : thisLinkOpts.type === "timechart" ? joinedChartCols?.otherDateCols
    : undefined;

  return (
    <FlexCol style={{ maxHeight: "min(550px, 100vh)" }} className="gap-p5">
      <InfoRow color="info" className="p-p5">
        <div style={{ fontWeight: "bold" }}>Join path</div>
        <FlexCol className="gap-0">
          {[{ table: tableName, on: [] }, ...(joinPath ?? [])]
            .toReversed()
            .map(({ table, on }, i, arr) => {
              const prevOn = arr[i - 1]?.on;
              const isLast = i === (joinPath?.length ?? 0);
              const leftCondition =
                !i || !prevOn ?
                  ""
                : ` (${prevOn.map((cond) => Object.keys(cond))})`;

              const nextOn = on;
              const rightCondition =
                nextOn.length ?
                  ` (${nextOn.map((cond) => Object.values(cond) as string[])})`
                : "";
              return (
                <div key={i} style={{ marginLeft: `${i}em` }}>
                  {" "}
                  <span style={{ fontSize: 14 }}>{leftCondition}</span>{" "}
                  <strong>{table}</strong>{" "}
                  <span style={{ fontSize: 14 }}>{rightCondition}</span>{" "}
                  {isLast ? "" : " -> "}
                </div>
              );
            })}
        </FlexCol>
      </InfoRow>
      {chartableColumns &&
        (thisLinkOpts.type === "map" || thisLinkOpts.type === "timechart") &&
        joinedChartCols && (
          <>
            <div
              className="bt b-color my-p5"
              style={{ width: "100%", height: "1px" }}
            />
            <SearchList
              label={
                <>
                  Add another joined layer to <strong>{tableName}</strong>
                </>
              }
              items={chartableColumns.map((column) => {
                const table = tables.find(
                  (t) => t.name === column.path.at(-1)?.table,
                );
                return {
                  key: column.key,
                  label: column.label + ` (${column.name})`,
                  iconLeft: {
                    type: "SvgIcon",
                    pathName:
                      (table?.icon as SvgIconName | undefined) || "Table",
                  },
                  onPress: async () => {
                    const { links, windows } = getLinksAndWindows();
                    await addChart({
                      newChart: {
                        type: thisLinkOpts.type,
                        columns: [column],
                        joinPath: column.path,
                        sql: undefined,
                        withStatement: "",
                      },
                      tables,
                      dbs,
                      myLinks: links.filter((l) =>
                        [l.w1_id, l.w2_id].includes(w.id),
                      ),
                      parentWindow: joinedChartCols.parentTable,
                      windows,
                      existingChartWindow: w,
                    });
                    onClose();
                  },
                };
              })}
            />
          </>
        )}
    </FlexCol>
  );
};
