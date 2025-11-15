import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexCol, FlexRow } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import { ScrollFade } from "@components/ScrollFade/ScrollFade";
import { mdiFilter, mdiSortAscending, mdiSortDescending } from "@mdi/js";
import { type DBHandlerClient } from "prostgles-client/dist/prostgles";
import type { SyncDataItem } from "prostgles-client/dist/SyncedTable/SyncedTable";
import { type ValidatedColumnInfo } from "prostgles-types";
import React, { useState } from "react";
import type { WindowData } from "src/dashboard/Dashboard/dashboardUtils";
import { useColumnStats } from "./useColumnQuickStats";

export type ColumnQuickStatsProps = {
  column: ValidatedColumnInfo;
  db: DBHandlerClient;
  w: SyncDataItem<Required<WindowData<"table">>, true>;
};
export const ColumnQuickStats = (props: ColumnQuickStatsProps) => {
  const [sortAscending, setSortAscending] = useState(false);
  const stats = useColumnStats(props, sortAscending);

  if (!stats) return <Loading />;
  if (stats.type === "error") return <ErrorComponent error={stats} />;

  const maxCount =
    stats.distribution ?
      Math.max(...stats.distribution.map((d) => d.count))
    : 0;

  return (
    <FlexCol
      className="ColumnQuickStats gap-1 ta-start"
      data-command="ColumnQuickStats"
      style={{ minWidth: "250px" }}
    >
      <StatRow label="Distinct" value={stats.distinctCount.toLocaleString()} />

      {stats.minMax && (
        <>
          <StatRow label="Min" value={stats.minMax.min?.toString() ?? "N/A"} />
          <StatRow label="Max" value={stats.minMax.max?.toString() ?? "N/A"} />
        </>
      )}

      {stats.distribution && stats.distribution.length > 0 && (
        <FlexCol
          className="gap-p5 mt-p5"
          style={{
            borderTop: "1px solid var(--border-color, #e0e0e0)",
          }}
        >
          <FlexRow
            className="ta-start"
            style={{
              opacity: 0.7,
            }}
          >
            <div>
              {stats.canSortDistribution ? "Top Values" : "Distribution"}
            </div>
            {stats.canSortDistribution && (
              <Btn
                className="ml-auto"
                iconPath={sortAscending ? mdiSortAscending : mdiSortDescending}
                onClick={() => setSortAscending(!sortAscending)}
              />
            )}
          </FlexRow>
          <ScrollFade className="no-scroll-bar o-auto flex-col gap-p5">
            {stats.distribution.map((d) => (
              <DistributionBar
                key={d.label}
                label={d.label}
                count={d.count}
                onClickAddFilter={d.onClick}
                max={maxCount}
              />
            ))}
          </ScrollFade>
        </FlexCol>
      )}
    </FlexCol>
  );
};

const StatRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex-row gap-p5 ai-center">
    <span style={{ opacity: 0.7, minWidth: "80px" }}>{label}:</span>
    <strong>{value}</strong>
  </div>
);

const DistributionBar = ({
  label,
  count,
  max,
  onClickAddFilter,
}: {
  label: string;
  count: number;
  max: number;
  onClickAddFilter?: () => void;
}) => {
  const percentage = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex-col gap-p5 trigger-hover">
      <div className="flex-row gap-p5 ai-center jc-between">
        <FlexRow>
          <strong>{label}</strong>
          {onClickAddFilter && (
            <Btn
              iconPath={mdiFilter}
              title="Add filter"
              color="action"
              size="micro"
              data-key={label}
              data-command="ColumnQuickStats.addFilter"
              className="show-on-trigger-hover"
              onClick={onClickAddFilter}
            />
          )}
        </FlexRow>
        <span style={{ opacity: 0.6 }} title="Count">
          {count.toLocaleString()}
        </span>
      </div>
      <div
        style={{
          height: "4px",
          background: "var(--bg-color-2, #e0e0e0)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: "var(--action-color, #2196F3)",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
};
