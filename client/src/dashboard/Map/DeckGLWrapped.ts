import { Deck, DeckProps, FlyToInterpolator, OrthographicView, WebMercatorViewport, LinearInterpolator, MapView } from "deck.gl/typed";
import { isDefined, omitKeys, pickKeys } from "../../utils";
import { Extent, HoverCoords } from "./DeckGLMap";
import { fitBounds } from "./fitBounds";



type MercatorViewState = {
  latitude: number;
  longitude: number;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  extent: Extent; //Bounds;
}

export type OrthoViewState = {
  target: [number, number, number] | [number, number],
  zoom?: number,
  extent: Bounds;
}

export type ViewState = Parameters<Required<DeckProps>["onViewStateChange"]>[0]["viewState"];

type DeckWrappedOpts = ({
  type: "orthographic";
  initialViewState: OrthoViewState | undefined;
} | {
  type: "mercator";
  initialViewState: MercatorViewState | undefined;
}) & Pick<DeckProps, "onClick" | "onHover" | "layers" | "onLoad" > & { // | "onViewStateChange"
  onViewStateChange: (params: ViewState, extent: Bounds) => any;
  onHoverItem?: (row: Record<string, any>  | undefined, coords: HoverCoords)=>void;
  onClickQuick?: (info: PickingInfo)=>void;
};

export default class DeckWrapped {

  readonly opts: DeckWrappedOpts;
  private currHoverObjectStr?: string;

  private currHover?: PickingInfo;

  private transitioning = false;

  static getViews = (type: "orthographic" | "mercator") => {
    return type === "orthographic" ?
      [new OrthographicView({ 
        id: '2d-scene', 
        controller: true, 
        flipY: false 
      })] : [new MapView({})]
  }

  deck: Deck;
  constructor(node: HTMLDivElement, opts: DeckWrappedOpts) {


    this.opts = opts;
    const { type, initialViewState: ivs } = this.opts;
    const initialViewState = type === "mercator"? { 
      latitude: ivs?.["latitude"] ?? 0,
      longitude: ivs?.["longitude"] ?? 50,
      zoom: ivs?.["zoom"] ?? 0,
      ...(ivs && pickKeys(ivs, ["bearing", "pitch", "zoom", "extent"], true))
    } : {
      target: ivs?.["target"] ?? [1,1,0],
      zoom: ivs?.["zoom"] ?? 0,
      ...(ivs && pickKeys(ivs, ["extent"], true))
    };

    this.deck = new Deck({
      initialViewState,
      parent: node,
      views: DeckWrapped.getViews(opts.type),
      controller: true,
      ...omitKeys(opts, ["type", "onHoverItem", "onHover", "onClickQuick", "onViewStateChange", "initialViewState"]),
      onHover: (opts.onHover || opts.onHoverItem || opts.onClickQuick)? (info, event) => {
        this.currHover = info;

        if(opts.onHoverItem && JSON.stringify(info.object ?? {}) !== this.currHoverObjectStr){
          this.currHoverObjectStr = JSON.stringify(info.object ?? {})
          opts.onHoverItem(info.object, { x: info.x, y: info.y, coordinates: info.coordinate as any, screenCoordinates: info.pixel } );
        }
        opts.onHover?.(info, event);
      } : undefined,
      onViewStateChange: (viewState) => {
        if(this.transitioning) return;
        this.onViewStateChangeDebounced(viewState.viewState);
      }

    });

    if(opts.onClickQuick){
      node.addEventListener("pointerdown", ev => {
        if(this.currHover) {
          opts.onClickQuick?.(this.currHover)
        }
      })
    }

    this.onViewStateChangeDebounced = debounce(this.onViewStateChangeDebounced.bind(this), 200)
  }

  static getViewState = <Type extends DeckWrappedOpts["type"]>(type: Type, state?: Partial<DeckWrappedOpts["initialViewState"]>): Type extends "orthographic"? OrthoViewState : MercatorViewState => {
    return type === "orthographic"? {
      target: [1,1,0],
      zoom: 0,
      ...(state as Partial<OrthoViewState>)
    } : ({
      longitude: 0,
      latitude: 51,
      zoom: 0,
      ...pickKeys(state as Partial<MercatorViewState>, ["zoom", "bearing", "pitch", "latitude", "longitude"]),
    } as any)
  }

  static get2DState(extent: Bounds, zoom = 0): OrthoViewState {
    const [[x1, y1], [x2, y2]] = extent;
    return {
      zoom,
      extent,
      target: [(x2-x1)/2, (y2-y1)/2, 0],
    }
  }

  // destroy(){
  //   if(this.deck.isInitialized){
  //     this.deck.vi
  //   }
  //   this.deck.isInitialized
  // }

  // getCoordsAtXY = () => {
  //   this.deck.getViewports()?.[0].containsPixel({})
  // }

  onViewStateChangeDebounced = (initialViewState: ViewState) => {
    const b = this.getExtent();
    if(!b) return;
    this.opts.onViewStateChange(initialViewState, b);
  }

  zoomTo = (bounds: Bounds) => {
    const viewport = this.deck.getViewports()[0];
    if(!viewport) return;
    
    try {
      let viewState: OrthoViewState | MercatorViewState | undefined;
      const OPTS = {
        padding: 20
      }
      if(this.opts.type !== "orthographic"){
        const { longitude, latitude, zoom } = "fitBounds" in viewport?  (viewport as WebMercatorViewport).fitBounds(bounds, OPTS) as any : (new WebMercatorViewport({}).fitBounds(bounds, OPTS))
        viewState = DeckWrapped.getViewState(this.opts.type, {
         longitude,
         latitude,
         zoom: Math.min(zoom, 15),
       });
      } else {
        viewState = {
          ...fitBounds({ padding: 50, bounds, width: viewport.width, height: viewport.height })
        }
      }
      
      const initialViewState = {
        ...viewState,
        transitionInterpolator: this.opts.type !== "orthographic" ? new FlyToInterpolator({ speed: 2 }) : new LinearInterpolator(['target', 'zoom']),
        transitionDuration: 800,
        onTransitionStart: () => {
          this.transitioning = true;
        },
        onTransitionEnd: () => {
          this.transitioning = false;
          this.onViewStateChangeDebounced(initialViewState);
        }
      };

      this.deck.setProps({ initialViewState })

    } catch (err){

      this.transitioning = false;
      console.log(err);
    }
  }


  /** Used in getting data */
  getExtent = (): Bounds | undefined => {

    const b = this.deck.getViewports()[0]?.getBounds();
    if(!b) return undefined;
    return [b.slice(0, 2) as any, b.slice(2) as any];
  
  }

  render(props: DeckProps){
    if(!this.deck.isInitialized){
      return
    }
    const currViews = this.deck.getViews().map(l => l.constructor.name);
    const curr2D = currViews.includes("OrthographicView");
    const nextViews = props.layers?.map(l => l?.constructor.name).filter(isDefined);
    const next2D = nextViews?.includes("BitmapLayer");
    if(currViews.length && curr2D !== next2D){
      const type = next2D? "orthographic" : "mercator"
      this.deck.setProps({
        ...props,
        views: DeckWrapped.getViews(type),
        initialViewState: DeckWrapped.getViewState(type),
        layers: props.layers
      })
    } else {
      this.deck.setProps(props)
    }
  }
}


type PickingInfo = {
  color: Uint8Array | null;
  layer: any | null;
  sourceLayer?: any | null;
  viewport?: any;
  index: number;
  picked: boolean;
  object?: any;
  x: number;
  y: number;
  pixel?: [number, number];
  coordinate?: number[];
  devicePixel?: [number, number];
  pixelRatio: number;
}

export type Bounds = [[number, number], [number, number]];

export function debounce<Params extends any[]>(
  func: (...args: Params) => any,
  timeout: number,
): (...args: Params) => void {
  let timer: NodeJS.Timeout
  return (...args: Params) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      func(...args)
    }, timeout)
  }
}

