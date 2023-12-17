import React from "react";
import { CommonWindowProps  } from "../Dashboard/Dashboard";
import Loading from "../../components/Loading";
import { TimeChart, TimeChartLayer } from "../Charts/TimeChart"
import Window from '../Window';
import RTComp, { DeltaOfData } from "../RTComp";
import ErrorComponent from "../../components/ErrorComponent";
import { mdiAlertCircleOutline, mdiFitToPageOutline, mdiUndo } from '@mdi/js';
import Btn from "../../components/Btn";
import PopupMenu from "../../components/PopupMenu"; 
import { AnyObject, getKeys, SubscriptionHandler, ParsedJoinPath } from "prostgles-types";  
import { getTimeChartData, getTimeChartSelectDate } from "./getTimeChartData";
import { TimeChartBinSize, ProstglesTimeChartMenu } from "./W_TimeChartMenu";
import { WindowSyncItem } from "../Dashboard/dashboardUtils";
import { LayerBase } from "../W_Map/W_Map";
import { ChartLayerManager } from "../WindowControls/ChartLayerManager";
import { getTimeChartLayerQueries } from "./getTimeChartLayers"; 
import { DateExtent, MainTimeBinSizes } from "../Charts/getTimechartBinSize";
import { MILLISECOND } from "../Charts";
import { createReactiveState } from "../ProstglesMethod/hooks";
import { AddTimeChartFilter } from "./AddTimeChartFilter";
import { ActiveRow } from "../W_Table/W_Table";
import { Command } from "../../Testing";
import { ColorByLegend } from "../WindowControls/ColorByLegend";

export type ProstglesTimeChartLayer = Pick<LayerBase, "_id" | "linkId" | "disabled"> & {
  
  dateColumn: string;
  groupByColumn: string | undefined;

  /**
   * If none then COUNT(*) will be used
   */
  statType: {
    funcName: string;
    numericColumn: string;
  } | undefined;
  color?: string;
  updateOptions: (newOptions: Partial<ProstglesTimeChartLayer>) => Promise<any>;
} & ({
  type: "sql";
  sql: string;
} | {
  type: "table";
  tableName: string;
  path: ParsedJoinPath[] | undefined;
  externalFilters: AnyObject[];
  tableFilter?: AnyObject;
});


export type ProstglesTimeChartProps = Omit<CommonWindowProps, "w"> & {
  onClickRow: (row: AnyObject | undefined, tableName: string, values: ActiveRow["timeChart"]) => void;
  myActiveRow: ActiveRow | undefined;
  activeRowColor: string | undefined;
  w: WindowSyncItem<"timechart">;
};

export type ProstglesTimeChartStateLayer = (Omit<TimeChartLayer, "yScale"> & {
    extFilter: {
      filter: any;
      paddedEdges: [Date, Date];
    } | undefined;
    /** This is used in caching results (extent filter is excluded) */
    dataSignature: string;
  })

export type ProstglesTimeChartState = {
  loading: boolean;
  loadingLayers: boolean;
  wSync: any;
  error?: any;
  layers: ProstglesTimeChartStateLayer[];
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
  lCols: { [key: string]: ProstglesTimeChartProps["tables"][number]["columns"] };
  dataAge: number;
}

export class W_TimeChart extends RTComp<ProstglesTimeChartProps, ProstglesTimeChartState, D> {

  refHeader?: HTMLDivElement;
  refResize?: HTMLElement;
  ref?: HTMLElement;

  state: ProstglesTimeChartState = {
    resetExtent: 0,
    xExtent: undefined,
    visibleDataExtent: undefined,
    loadingLayers: false,
    loading: false,
    wSync: null,
    layers: [],
    error: null,
    loadingData: true,
    columns: [],
  }

  

  async onMount(){
    const { w } = this.props;
    if(!this.state.wSync){
      const wSync = await w.$cloneSync((w, delta)=> {
        this.setData({ w }, { w: delta });
      });
      
      this.setState({ wSync })
    }
  }

  onUnmount(){
    this.state.wSync?.$unsync?.();
  }
 


  onDelta = async (dp: DeltaOfData<ProstglesTimeChartProps>, ds: DeltaOfData<ProstglesTimeChartState>, dd: DeltaOfData<D>) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const deltaKeys = getKeys({ ...dp, ...ds, ...dd } || {});
    const filterChanged = dd?.w?.options && "filter" in dd.w.options
    if(
      filterChanged ||
      dd?.w?.options?.binSize || 
      (["myLinks", "w", "resetExtent", "viewPortExtent", "prgl", "dataAge"] as const).find(k => deltaKeys.includes(k)) 
    ){
      this.setLayerData();
    } 

    if(filterChanged){
      this.props.onForceUpdate();
    }
     
  }


  // okthere = false;
  d: D = { 
    lCols: {},
    w: undefined,
    extent: undefined,
    dataAge: 0
  };

  /* Throttle data updates */
  settingDataAge: any;
  dataAge?: number;
  setDataAge = (dataAge: number) => {
    this.dataAge = dataAge;
    if(!this.settingDataAge){
      this.settingDataAge = setTimeout(() => {
        this.setData({ dataAge: this.dataAge });
        this.settingDataAge = null;
      }, 300);
    }
  }
  
  layerSubscriptions: Record<string, { filterStr: string; sub: SubscriptionHandler; dataAge: number; }> = {};

  dataStr?: string;
  setLayerData = async () => {
    this.setState({ loadingData: true });
    try {
      const d = await getTimeChartData.bind(this)();
      if(d){
        const { error, layers: rawLayers } = d;
        const binSize = d.binSize? MainTimeBinSizes[d.binSize].size : undefined;
        const layers = rawLayers.map(l => {
          const sortedParsedData = l.data.map(d => {

            return {
              ...d,
              date: +new Date(d.date)
            }
          }).sort((a, b) => a.date - b.date);

          /** Add empty bins */
          let filledData = sortedParsedData.slice(0, 0);
          const { missingBins = "show 0", renderStyle = "line" } = this.d.w?.options ?? {};
          if(binSize){
            if(missingBins === "ignore" || renderStyle !== "line"){
              filledData = sortedParsedData.slice(0);
            } else if(missingBins === "show nearest"){
              filledData = sortedParsedData.slice(0);
              for(let i = sortedParsedData.length - 1; i >= 0; i--){
                const d = sortedParsedData[i];
                const nextD = sortedParsedData[i+1];

                if(d && nextD){
                  const gapSize = nextD.date - d.date;
                  const gapSizeInBins = Math.floor(gapSize / binSize);
                  const halfGapSizeInBins = Math.floor(gapSizeInBins/2);
                  if(gapSize > binSize + MILLISECOND){
                    filledData.splice(i+1, 0, {
                      value: nextD.value,
                      date: nextD.date - (halfGapSizeInBins * binSize),
                    });
                    /** If not exactly in the middle then also add the left point */
                    if(gapSizeInBins%2 !== 0){
                      const leftGapSizeInBins = Math.floor(gapSizeInBins/2);
                      filledData.splice(i, 0, {
                        value: d.value,
                        date: d.date + (leftGapSizeInBins * binSize),
                      });
                    }
                  }
                }
              }
            } else {
              sortedParsedData.forEach(d=> {
    
                let preLastItem = filledData.at(-2);
                let lastItem = filledData.at(-1);
                if(!lastItem){
                  filledData.push(d);
                } else {
                  while(d.date - lastItem!.date > binSize + MILLISECOND) {
                    const emptyItem = {
                      value: 0,
                      date: lastItem!.date + binSize,
                    }
                    /** Update last point if drawing a straigh line to avoid too many points */
                    if(lastItem && preLastItem && Number(preLastItem.value) === 0 && Number(lastItem.value) === 0){
                      lastItem.date = emptyItem.date;
                    } else {
                      filledData.push(emptyItem);
                    }
                    preLastItem = filledData.at(-2);
                    lastItem = filledData.at(-1);
                  }
                  filledData.push(d);
                }
              });
            }
          }

          if(this.ref && this.chartRef){
            const renderedData = filledData.map(d => {
              const [x, y] = this.chartRef!.getPointXY({ date: new Date(d.date), value: d.value }) ?? [];
              return {
                x, y, value: d.value
              }
            });
            (this.ref as any)._renderedData = renderedData;
          }
          
          return {
            ...l,
            data: filledData,
          }
        });

        this.setState({ loadingData: false, loadingLayers: false, loading: false, binSize: d.binSize, error, layers });
      }
    } catch(error){
      this.setState({ loading: false, error, loadingData: false })
    }
  }

  settingExtent: any;
  private visibleDataExtent?: DateExtent;
  private viewPortExtent?: DateExtent;
  setVisibleExtent(data: ProstglesTimeChartState["visibleDataExtent"], viewPort: DateExtent){
    this.visibleDataExtent = data;
    this.viewPortExtent = viewPort;
    if(this.settingExtent) clearTimeout(this.settingExtent);

    this.settingExtent = setTimeout(() => {
      this.setState({ 
        visibleDataExtent: this.visibleDataExtent, 
        viewPortExtent: this.viewPortExtent 
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
    return <ProstglesTimeChartMenu 
      w={w}
      autoBinSize={this.state.binSize}
    />
  }

  addingFilter = createReactiveState<{ startX?: number; endX?: number; } | undefined>(undefined, newState => {
    const isAddingFilter = !!newState;
    if(isAddingFilter !== this.state.addingFilter){
      this.setState({ addingFilter: isAddingFilter })
    }
  })

  menuAnchor?: HTMLDivElement;
  chartRef?: TimeChart;
  render(){
    const {  
      layers = [], 
      loadingLayers, 
      error, 
      xExtent, 
      visibleDataExtent: extent, 
      loadingData,
      addingFilter = false,
    } = this.state;

    const {
      onClickRow,
      myActiveRow,
      activeRowColor,
    } = this.props;

    const { w } = this.d;
    if(!w) return <Loading className="m-auto f-1"/>;

    let errorPopup;

    const groupedByLayer = this.layerQueries.find(lq => !lq.disabled && lq.groupByColumn && lq.type === "table");

    if(error){
      errorPopup = (
        <PopupMenu
          button={<Btn className="text-red-500" iconPath={mdiAlertCircleOutline} />} 
          onClose={()=>{
            this.setState({ showError: false })
          }}>
          <div className="bg-0">
            <ErrorComponent error={error} />
          </div>
        </PopupMenu>
      )
    }

    const infoSection = <div className="flex-row relative f-1 m-auto " style={{ position: "absolute", top:"0", left:"0", zIndex: 2 }} >
      <ChartLayerManager 
        { ...this.props } 
        w={w} 
        type="timechart" 
        asMenuBtn={{}} 
        layerQueries={this.layerQueries} 
      />
      {!loadingLayers? null : <Loading className="m-auto f-1" delay={100} variant="cover" />}
      {errorPopup}
      {this.state.visibleDataExtent && <Btn 
        title="Reset extent" 
        iconPath={mdiUndo} 
        onClick={() => 
          this.setState({ 
            visibleDataExtent: undefined, 
            viewPortExtent: undefined,
            resetExtent: Date.now() 
          })
        }
      />}
      {groupedByLayer && <ColorByLegend
        className="ml-2"
        { ...this.props}
        layerLinkId={groupedByLayer.linkId}
        groupByColumn={groupedByLayer.groupByColumn!}
        onChanged={() => {
          this.setData({ dataAge: Date.now() })
        }}
      />}
    </div>

    const hasPanned = Boolean(extent && xExtent && Object.values(extent).join() !== xExtent.join())
    const resetExtent = () => {
      if(this.chartRef?.chart){
        this.chartRef.chart.setView({ xO: 0, xScale: 1, yO: 0, yScale: 1 });
        this.setState({ visibleDataExtent: undefined, viewPortExtent: undefined }) 
      }
    } 
    const binSize = MainTimeBinSizes[this.state.binSize as string]?.size;
    const onCancelActiveRow = () => onClickRow(undefined, "", undefined)
    const content = <>
      <div 
        ref={r => {
          if(r) this.menuAnchor = r;
        }} 
        style={{ width: "1px", height: "1px"}}
      />

      <div className="W_TimeChart relative f-1 flex-col min-h-0 min-w-0 noselect "
        data-command={"W_TimeChart" satisfies Command}
        style={{
          backgroundColor: "var(--color-timechart-bg)"
        }}
        ref={r => {
          if(r) this.ref = r;
        }} 
      >
        {loadingData && <Loading variant="cover" delay={200} />}
        {infoSection}
        {!hasPanned? null : 
          <Btn title="Zoom out to data extent"
            style={{ position: "absolute", right: 0, top: 0, zIndex: 1 }} 
            iconPath={mdiFitToPageOutline} 
            onClick={resetExtent} 
          />}
        {this.chartRef && 
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
              const newFilter =  !filter? null : { 
                min: +filter.min,
                max: +filter.max,
              };
              this.d.w?.$update({ 
                options: { ...this.d.w.options, filter: newFilter },
              });
              this.setState({ addingFilter: false });
              resetExtent();
            }}
          />
        }
        <TimeChart
          key={this.state.resetExtent}
          layers={layers}
          chartRef={ref => { this.chartRef = ref; }}
          onExtentChanged={(extent, viewPort, opts) => {
            if(opts.resetExtent){
              resetExtent();
            } else {
              this.setVisibleExtent(extent, viewPort);
            }
            onClickRow(undefined, "", undefined)
          }}
          onClick={async ({ dateMillis, isMinDate }) => {
            if(this.state.addingFilter) return;
            const [firstLink, ...otherLinks] = this.props.myLinks;
            if(firstLink?.options.type === "timechart" && !otherLinks.length && binSize && this.state.binSize && this.state.binSize !== "auto"){
              const { windows } = this.props.getLinksAndWindows();
              const myTable = windows.find(w => w.id !== this.d.w?.id && [firstLink.w1_id, firstLink.w2_id].includes(w.id));
              if(myTable?.type === "table" && myTable.table_name){
                const dateColumn = firstLink.options.columns[0]?.name;
                if(dateColumn){
                  const min = new Date(dateMillis);
                  const max = new Date(dateMillis + binSize);
                  const dateSelect = getTimeChartSelectDate({ dateColumn, bin: this.state.binSize });
                  const filter = {
                    $filter: [
                      dateSelect,
                      isMinDate? "<=" : "=",
                      new Date(dateMillis)
                    ]
                  }
                  onClickRow(filter, myTable.table_name, { min, max, center: new Date(dateMillis) })
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


    return <Window w={w} getMenu={this.getMenu}>{content}</Window>; 
  }
}
