import Btn from "@components/Btn";
import ErrorComponent from "@components/ErrorComponent";
import { FlexRow } from "@components/Flex";
import Loading from "@components/Loader/Loading";
import PopupMenu from "@components/PopupMenu";
import { mdiAlertCircleOutline, mdiUndo } from "@mdi/js";
import { isDefined } from "prostgles-types";
import React from "react";
import type { TimeChart } from "../Charts/TimeChart/TimeChart";
import { DataLayerManager } from "../WindowControls/DataLayerManager/DataLayerManager";
import { AddTimeChartFilter } from "./AddTimeChartFilter";
import type {
  ProstglesTimeChartLayer,
  W_TimeChartProps,
  W_TimeChartState,
} from "./W_TimeChart";
import { W_TimeChartLayerLegend } from "./W_TimeChartLayerLegend";

type P = Pick<
  W_TimeChartProps,
  | "w"
  | "onClickRow"
  | "activeRowColor"
  | "myActiveRow"
  | "myLinks"
  | "getLinksAndWindows"
> & {
  chartRef: TimeChart;
  layerQueries: ProstglesTimeChartLayer[];
  fetchingError: unknown;
  visibleDataExtent: W_TimeChartState["visibleDataExtent"];
  erroredLayers: W_TimeChartState["erroredLayers"];
  layers: W_TimeChartState["layers"];
  loadingData: W_TimeChartState["loadingData"];
  onColorLegendChanged: VoidFunction;
  setAddingFilter: (adding: boolean) => void;
  resetExtent: (refetchData?: true) => void;
};
export const W_TimeChartHeaderControls = (props: P) => {
  const {
    chartRef,
    onClickRow,
    myActiveRow,
    activeRowColor,
    visibleDataExtent,
    erroredLayers,
    w,
    layerQueries,
    fetchingError,
    layers,
    loadingData,
    onColorLegendChanged,
    setAddingFilter,
    resetExtent,
  } = props;
  const error =
    fetchingError ?? (erroredLayers?.[0]?.hasError && erroredLayers[0].error);

  const onCancelActiveRow = () => onClickRow(undefined, "", undefined);
  const infoSection = (
    <FlexRow
      className="W_TimeChart_TopBar gap-0 relative f-1 m-auto "
      style={{
        position: "absolute",
        top: "0",
        left: "0",
        /** Ensure it doesn't clash with right add filter button */
        maxWidth: "calc(100% - 60px)",
        /* Ensure it doesn't cover the tooltip active row brush */
        zIndex: 1,
      }}
    >
      <DataLayerManager
        {...props}
        w={w}
        type="timechart"
        asMenuBtn={{}}
        layerQueries={layerQueries}
      />
      {isDefined(error) && (
        <PopupMenu
          button={<Btn color="danger" iconPath={mdiAlertCircleOutline} />}
        >
          <div className="bg-color-0">
            <ErrorComponent error={error} findMsg={true} />
          </div>
        </PopupMenu>
      )}
      <Btn
        title="Reset extent"
        data-command="W_TimeChart.resetExtent"
        style={{
          opacity: visibleDataExtent ? 1 : 0,
        }}
        iconPath={mdiUndo}
        onClick={() => resetExtent(true)}
      />
      <W_TimeChartLayerLegend
        {...props}
        layers={layers}
        layerQueries={layerQueries}
        onChanged={onColorLegendChanged}
      />
    </FlexRow>
  );

  return (
    <>
      {loadingData && w.options.refresh?.type !== "Realtime" && (
        <Loading variant="cover" delay={1500} />
      )}
      {infoSection}
      <AddTimeChartFilter
        activeRowColor={activeRowColor}
        myActiveRow={myActiveRow}
        filter={w.options.filter}
        chartRef={chartRef}
        onCancelActiveRow={onCancelActiveRow}
        onStart={() => {
          onCancelActiveRow();
          setAddingFilter(true);
        }}
        onEnd={(filter) => {
          const newFilter =
            !filter ? null : (
              {
                min: +filter.min,
                max: +filter.max,
              }
            );
          w.$update({
            options: { ...w.options, filter: newFilter },
          });
          setAddingFilter(false);
          resetExtent();
        }}
      />
    </>
  );
};
