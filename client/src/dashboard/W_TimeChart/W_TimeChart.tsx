import { mdiAlertCircleOutline, mdiUndo } from "@mdi/js";
import type {
  AnyObject,
  ParsedJoinPath,
  SubscriptionHandler,
} from "prostgles-types";
import { getKeys } from "prostgles-types";
import React from "react";
import { throttle } from "../../../../commonTypes/utils";
import { createReactiveState } from "../../appUtils";
import Btn from "../../components/Btn";
import ErrorComponent from "../../components/ErrorComponent";
import Loading from "../../components/Loading";
import PopupMenu from "../../components/PopupMenu";
import type { Command } from "../../Testing";
import type { DateExtent } from "../Charts/getTimechartBinSize";
import { getMainTimeBinSizes } from "../Charts/getTimechartBinSize";
import type { TimeChartLayer } from "../Charts/TimeChart";
import { TimeChart } from "../Charts/TimeChart";
import type { CommonWindowProps } from "../Dashboard/Dashboard";
import type { WindowSyncItem } from "../Dashboard/dashboardUtils";
import RTComp from "../RTComp";
import type { LayerBase } from "../W_Map/W_Map";
import type { ActiveRow } from "../W_Table/W_Table";
import Window from "../Window";
import { ChartLayerManager } from "../WindowControls/ChartLayerManager";
import { AddTimeChartFilter } from "./AddTimeChartFilter";
import { fetchAndSetTimechartLayerData } from "./fetchAndSetTimechartLayerData";
import { getTimeChartSelectDate } from "./getTimeChartData";
import { getTimeChartLayerQueries } from "./getTimeChartLayers";
import type { TimeChartLayerWithBinOrError } from "./getTimeChartLayersWithBins";
import { W_TimeChartLayerLegend } from "./W_TimeChartLayerLegend";
import type { TimeChartBinSize } from "./W_TimeChartMenu";
import { ProstglesTimeChartMenu } from "./W_TimeChartMenu";
import { FlexRow } from "../../components/Flex";
import type { DBSSchema } from "../../../../commonTypes/publishUtils";

type ChartColumn = Extract<
  DBSSchema["links"]["options"],
  { type: "timechart" }
>;
export type ProstglesTimeChartLayer = Pick<
  LayerBase,
  "_id" | "linkId" | "disabled"
> & {
  dateColumn: string;
  groupByColumn: string | undefined;

  /**
   * If none then COUNT(*) will be used
   */
  statType:
    | {
        funcName: Required<
          ChartColumn["columns"][number]
        >["statType"]["funcName"];
        numericColumn: string;
      }
    | undefined;
  color?: string;
  updateOptions: (newOptions: Partial<ProstglesTimeChartLayer>) => Promise<any>;
} & (
    | {
        type: "sql";
        sql: string;
        withStatement: string;
      }
    | {
        type: "table";
        tableName: string;
        path: ParsedJoinPath[] | undefined;
        externalFilters: AnyObject[];
        tableFilter?: AnyObject;
      }
  );

export type ProstglesTimeChartProps = Omit<CommonWindowProps, "w"> & {
  onClickRow: (
    row: AnyObject | undefined,
    tableName: string,
    values: ActiveRow["timeChart"],
  ) => void;
  myActiveRow: ActiveRow | undefined;
  activeRowColor: string | undefined;
  w: WindowSyncItem<"timechart">;
};

export type ProstglesTimeChartStateLayer = Omit<TimeChartLayer, "yScale"> & {
  extFilter:
    | {
        filter: any;
        paddedEdges: [Date, Date];
      }
    | undefined;
  /** This is used in caching results (extent filter is excluded) */
  dataSignature: string;
};

export type ProstglesTimeChartState = {
  loading: boolean;
  wSync: any;
  error?: any;
  layers: ProstglesTimeChartStateLayer[];
  erroredLayers?: TimeChartLayerWithBinOrError[];
  columns: any[];
  xExtent?: [Date, Date];
  visibleDataExtent?: DateExtent;
  viewPortExtent?: DateExtent;
  resetExtent?: number;
  binSize?: TimeChartBinSize;
  showError?: boolean;
  loadingData: boolean;
  addingFilter?: boolean;
};

type D = {
  extent?: DateExtent;
  w?: WindowSyncItem<"timechart">;
  lCols: {
    [key: string]: ProstglesTimeChartProps["tables"][number]["columns"];
  };
  dataAge: number;
};

export class W_TimeChart extends RTComp<
  ProstglesTimeChartProps,
  ProstglesTimeChartState,
  D
> {
  refHeader?: HTMLDivElement;
  refResize?: HTMLElement;
  ref?: HTMLElement;

  state: ProstglesTimeChartState = {
    resetExtent: 0,
    xExtent: undefined,
    visibleDataExtent: undefined,
    loading: false,
    wSync: null,
    layers: [],
    error: null,
    loadingData: true,
    columns: [],
  };

  async onMount() {
    const { w } = this.props;
    if (!this.state.wSync) {
      const wSync = await w.$cloneSync((w, delta) => {
        this.setData({ w }, { w: delta });
      });

      this.setState({ wSync });
    }
  }

  onUnmount() {
    this.state.wSync?.$unsync?.();
  }

  onDelta = async (dp, ds, dd) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const deltaKeys = getKeys({ ...dp, ...ds, ...dd });
    const filterChanged = dd?.w?.options && "filter" in dd.w.options;
    if (
      filterChanged ||
      dd?.w?.options?.binSize ||
      (
        [
          "myLinks",
          "w",
          "resetExtent",
          "viewPortExtent",
          "prgl",
          "dataAge",
        ] as const
      ).find((k) => deltaKeys.includes(k))
    ) {
      this.setLayerData();
    }

    if (filterChanged) {
      this.props.onForceUpdate();
    }
  };

  d: D = {
    lCols: {},
    w: undefined,
    extent: undefined,
    dataAge: 0,
  };

  /* Throttle data updates */
  dataAge?: number;
  setDataAge = (dataAge: number) => {
    this.dataAge = dataAge;
    this._setDataAge();
  };
  _setDataAge = throttle(() => {
    this.setData({ dataAge: this.dataAge });
  }, 300);

  layerSubscriptions: Record<
    string,
    {
      externalFilters: any;
      realtimeOpts: any;
      sub: SubscriptionHandler | undefined;
      /**
       * Data age of the fetched data
       */
      dataAge: number;
      /**
       * Received from subscription
       */
      latestDataAge: number;
      isLoading: boolean;
    }
  > = {};

  dataStr?: string;
  setLayerData = fetchAndSetTimechartLayerData.bind(this);

  settingExtent: any;
  private visibleDataExtent?: DateExtent;
  private viewPortExtent?: DateExtent;
  setVisibleExtent(
    data: ProstglesTimeChartState["visibleDataExtent"],
    viewPort: DateExtent,
  ) {
    this.visibleDataExtent = data;
    this.viewPortExtent = viewPort;
    if (this.settingExtent) clearTimeout(this.settingExtent);

    this.settingExtent = setTimeout(() => {
      this.setState({
        visibleDataExtent: this.visibleDataExtent,
        viewPortExtent: this.viewPortExtent,
      });
      this.visibleDataExtent = undefined;
      this.viewPortExtent = undefined;
      this.settingExtent = null;
    }, 100);
  }

  get layerQueries() {
    const { getLinksAndWindows, myLinks, w, active_row } = this.props;
    const { links, windows } = getLinksAndWindows();
    return getTimeChartLayerQueries({ active_row, links, myLinks, w, windows });
  }

  getMenu = (w: WindowSyncItem<"timechart">) => {
    return <ProstglesTimeChartMenu w={w} autoBinSize={this.state.binSize} />;
  };

  addingFilter = createReactiveState<
    { startX?: number; endX?: number } | undefined
  >(undefined, (newState) => {
    const isAddingFilter = !!newState;
    if (isAddingFilter !== this.state.addingFilter) {
      this.setState({ addingFilter: isAddingFilter });
    }
  });

  menuAnchor?: HTMLDivElement;
  chartRef?: TimeChart;
  render() {
    const {
      layers = [],
      erroredLayers,
      error: fetchingError,
      loadingData,
      addingFilter = false,
    } = this.state;

    const { onClickRow, myActiveRow, activeRowColor } = this.props;

    const { w } = this.d;
    if (!w) return <Loading className="m-auto f-1" />;

    let errorPopup;

    const { layerQueries } = this;

    const error =
      fetchingError ?? (erroredLayers?.[0]?.hasError && erroredLayers[0].error);
    if (error) {
      errorPopup = (
        <PopupMenu
          button={<Btn color="danger" iconPath={mdiAlertCircleOutline} />}
          onClose={() => {
            this.setState({ showError: false });
          }}
        >
          <div className="bg-color-0">
            <ErrorComponent error={error} findMsg={true} />
          </div>
        </PopupMenu>
      );
    }

    const resetExtent = () => {
      if (this.chartRef?.chart) {
        this.chartRef.chart.setView({ xO: 0, xScale: 1, yO: 0, yScale: 1 });
        this.setState({
          visibleDataExtent: undefined,
          viewPortExtent: undefined,
        });
      }
    };
    const binSize = getMainTimeBinSizes()[this.state.binSize as string]?.size;
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
        <ChartLayerManager
          {...this.props}
          w={w}
          type="timechart"
          asMenuBtn={{}}
          layerQueries={layerQueries}
        />
        {/* {loadingLayers && 
        <Loading 
          className="m-auto f-1" 
          delay={1500} 
          variant="cover" 
        />
      } */}
        {errorPopup}
        <Btn
          title="Reset extent"
          style={{
            opacity: this.state.visibleDataExtent ? 1 : 0,
          }}
          iconPath={mdiUndo}
          onClick={() =>
            this.setState({
              visibleDataExtent: undefined,
              viewPortExtent: undefined,
              resetExtent: Date.now(),
            })
          }
        />
        <W_TimeChartLayerLegend
          {...this.props}
          layers={layers}
          layerQueries={this.layerQueries}
          onChanged={() => {
            this.setData({ dataAge: Date.now() });
          }}
        />
      </FlexRow>
    );

    const content = (
      <>
        <div
          ref={(r) => {
            if (r) this.menuAnchor = r;
          }}
          style={{ width: "1px", height: "1px" }}
        />

        <div
          className="W_TimeChart relative f-1 flex-col min-h-0 min-w-0 noselect "
          data-command={"W_TimeChart" satisfies Command}
          style={{
            backgroundColor: "var(--color-timechart-bg)",
          }}
          ref={(r) => {
            if (r) this.ref = r;
          }}
        >
          {loadingData && this.d.w?.options.refresh?.type !== "Realtime" && (
            <Loading variant="cover" delay={1500} />
          )}
          {infoSection}

          {this.chartRef && (
            <AddTimeChartFilter
              activeRowColor={activeRowColor}
              myActiveRow={myActiveRow}
              filter={w.options.filter}
              chartRef={this.chartRef}
              onCancelActiveRow={onCancelActiveRow}
              onStart={() => {
                onCancelActiveRow();
                this.setState({ addingFilter: true });
              }}
              onEnd={(filter) => {
                const newFilter =
                  !filter ? null : (
                    {
                      min: +filter.min,
                      max: +filter.max,
                    }
                  );
                this.d.w?.$update({
                  options: { ...this.d.w.options, filter: newFilter },
                });
                this.setState({ addingFilter: false });
                resetExtent();
              }}
            />
          )}
          <TimeChart
            key={this.state.resetExtent}
            layers={layers}
            chartRef={(ref) => {
              this.chartRef = ref;
            }}
            onExtentChanged={(extent, viewPort, opts) => {
              if (opts.resetExtent) {
                resetExtent();
              } else {
                this.setVisibleExtent(extent, viewPort);
              }
              onClickRow(undefined, "", undefined);
            }}
            onClick={async ({ dateMillis, isMinDate }) => {
              if (this.state.addingFilter) return;
              const [firstLink, ...otherLinks] = this.props.myLinks;
              if (
                firstLink?.options.type === "timechart" &&
                !otherLinks.length &&
                binSize &&
                this.state.binSize &&
                this.state.binSize !== "auto"
              ) {
                const { windows } = this.props.getLinksAndWindows();
                const myTable = windows.find(
                  (w) =>
                    w.id !== this.d.w?.id &&
                    [firstLink.w1_id, firstLink.w2_id].includes(w.id),
                );
                if (myTable?.type === "table" && myTable.table_name) {
                  const dateColumn = firstLink.options.columns[0]?.name;
                  if (dateColumn) {
                    const min = new Date(dateMillis);
                    const max = new Date(dateMillis + binSize);
                    const dateSelect = getTimeChartSelectDate({
                      dateColumn,
                      bin: this.state.binSize,
                    });
                    const filter = {
                      $filter: [
                        dateSelect,
                        isMinDate ? "<=" : "=",
                        new Date(dateMillis),
                      ],
                    };
                    onClickRow(filter, myTable.table_name, {
                      min,
                      max,
                      center: new Date(dateMillis),
                    });
                  }
                }
              }
            }}
            zoomPanDisabled={addingFilter}
            tooltipPosition={w.options.tooltipPosition ?? "auto"}
            renderStyle={w.options.renderStyle ?? "line"}
            showBinLabels={w.options.showBinLabels ?? "off"}
            binValueLabelMaxDecimals={w.options.binValueLabelMaxDecimals}
            binSize={binSize}
          />
        </div>
      </>
    );

    return (
      <Window w={w} getMenu={this.getMenu}>
        {content}
      </Window>
    );
  }
}
