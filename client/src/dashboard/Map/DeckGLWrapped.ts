import type {
  Deck,
  DeckProps,
  MapView,
  MapViewState,
  OrthographicView,
  OrthographicViewState,
  WebMercatorViewport,
} from "deck.gl";
import { isDefined, omitKeys, pickKeys } from "prostgles-types";
import type { HoverCoords } from "./DeckGLMap";
import { fitBounds } from "./fitBounds";
import { createReactiveState } from "../../appUtils";
export const getDeckLibs = async () => {
  const lib = await import(/* webpackChunkName: "deckgl" */ "deck.gl");
  const mvtLoader = await import(
    /* webpackChunkName: "mvtLoader" */ "@loaders.gl/mvt"
  );
  // const extensions = await import(/* webpackChunkName: "deckglExtensions" */ "@deck.gl/extensions");

  return {
    lib,
    MVTLoader: mvtLoader.MVTLoader,
    // extensions
  };
};
export type DeckGlLib = Awaited<ReturnType<typeof getDeckLibs>>["lib"];
export type DeckGlLibs = Awaited<ReturnType<typeof getDeckLibs>>;

export type ViewState = MapViewState | OrthographicViewState;
type DeckWrappedOpts = (
  | {
      type: "orthographic";
      initialViewState: OrthographicViewState | undefined;
    }
  | {
      type: "mercator";
      initialViewState: MapViewState | undefined;
    }
) &
  Pick<DeckProps, "onClick" | "onHover" | "layers" | "onLoad"> & {
    // | "onViewStateChange"
    onViewStateChange: (params: ViewState, extent: Bounds) => any;
    onHoverItem?: (
      row: Record<string, any> | undefined,
      coords: HoverCoords,
    ) => void;
    onClickQuick?: (info: PickingInfo) => void;
  };

export class DeckWrapped {
  readonly opts: DeckWrappedOpts;
  lib: DeckGlLib;
  private currHoverObjectStr?: string;

  currHover?: PickingInfo;
  currHoverRState = createReactiveState(this.currHover);
  private transitioning = false;

  deck: Deck<OrthographicView[] | MapView[]>;
  constructor(node: HTMLDivElement, opts: DeckWrappedOpts, lib: DeckGlLib) {
    this.lib = lib;
    this.opts = opts;
    const { type, initialViewState } = this.opts;

    this.deck = new lib.Deck({
      ...(getViews({ type, lib, initialViewState }) as any),
      parent: node,
      controller: true,
      ...omitKeys(opts, [
        "type",
        "onHoverItem",
        "onHover",
        "onClickQuick",
        "onViewStateChange",
        "initialViewState",
      ]),
      onHover:
        opts.onHover || opts.onHoverItem || opts.onClickQuick ?
          (info: PickingInfo, event) => {
            this.currHover = info;
            this.currHoverRState.set(info);
            if (
              opts.onHoverItem &&
              JSON.stringify(info.object ?? {}) !== this.currHoverObjectStr
            ) {
              this.currHoverObjectStr = JSON.stringify(info.object ?? {});
              opts.onHoverItem(info.object, {
                x: info.x,
                y: info.y,
                coordinates: info.coordinate,
                screenCoordinates: info.pixel,
              });
            }
            opts.onHover?.(info, event);
          }
        : undefined,
      onViewStateChange: ({ viewState }) => {
        if (this.transitioning) return;
        this.onViewStateChangeDebounced(viewState);
      },
    });

    if (opts.onClickQuick) {
      node.addEventListener("pointerdown", (ev) => {
        if (!ev.target) return;
        const bbox = (ev.target as HTMLDivElement).getBoundingClientRect(),
          x = ev.clientX - bbox.x,
          y = ev.clientY - bbox.y,
          maxDist = 4;
        if (
          this.currHover &&
          this.currHover.x - x < maxDist &&
          this.currHover.y - y < maxDist
        ) {
          opts.onClickQuick?.(this.currHover);
        }
      });
    }

    this.onViewStateChangeDebounced = debounce(
      this.onViewStateChangeDebounced.bind(this),
      200,
    );
  }

  onViewStateChangeDebounced = (initialViewState: ViewState) => {
    const b = this.getExtent();
    if (!b) return;
    this.opts.onViewStateChange(initialViewState, b);
  };

  zoomTo = (
    bounds:
      | Bounds
      | { type: "point"; latitude: number; longitude: number; zoom: number },
  ) => {
    const viewport = this.deck.getViewports()[0];
    if (!viewport) return;

    try {
      let viewState: OrthographicViewState | MapViewState | undefined;
      const OPTS = {
        padding: 20,
      };
      if (this.opts.type !== "orthographic") {
        const { longitude, latitude, zoom } =
          !Array.isArray(bounds) ? bounds
          : "fitBounds" in viewport ?
            ((viewport as WebMercatorViewport).fitBounds(bounds, OPTS) as any)
          : new this.lib.WebMercatorViewport({}).fitBounds(bounds, OPTS);
        viewState = getViewState(this.opts.type, {
          longitude,
          latitude,
          zoom: Math.min(zoom, 15),
        });
      } else {
        if (!Array.isArray(bounds)) {
          throw "Unexpected";
        }
        viewState = {
          ...fitBounds({
            padding: 50,
            bounds,
            width: viewport.width,
            height: viewport.height,
          }),
        };
      }

      const initialViewState: MapViewState | OrthographicViewState = {
        ...viewState,
        transitionInterpolator:
          this.opts.type !== "orthographic" ?
            new this.lib.FlyToInterpolator({ speed: 2 })
          : new this.lib.LinearInterpolator(["target", "zoom"]),
        transitionDuration: 800,
        onTransitionStart: () => {
          this.transitioning = true;
        },
        onTransitionEnd: () => {
          this.transitioning = false;
          this.onViewStateChangeDebounced(initialViewState);
        },
      };

      this.deck.setProps({ initialViewState } as any);
    } catch (err) {
      this.transitioning = false;
      console.log(err);
    }
  };

  /** Used in getting data */
  getExtent = (): Bounds | undefined => {
    const b = this.deck.getViewports()[0]?.getBounds();
    if (!b) return undefined;
    return [b.slice(0, 2) as any, b.slice(2) as any];
  };

  render(props: DeckProps) {
    if (!this.deck.isInitialized) {
      return;
    }
    const currViews = this.deck.getViews().map((l) => l.constructor.name);
    const curr2D = currViews.includes("OrthographicView");
    const nextViews = props.layers
      ?.map((l) => l?.constructor.name)
      .filter(isDefined);
    const next2D = nextViews?.includes("BitmapLayer");
    if (currViews.length && curr2D !== next2D) {
      const type = next2D ? "orthographic" : "mercator";
      this.deck.setProps({
        ...props,
        ...getViews({
          type,
          lib: this.lib,
          initialViewState: this.opts.initialViewState,
        }),
        layers: props.layers,
      } as any);
    } else {
      this.deck.setProps(props as any);
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
  coordinate?: [number, number];
  devicePixel?: [number, number];
  pixelRatio: number;
};

export type Bounds = [[number, number], [number, number]];

export function debounce<Params extends any[]>(
  func: (...args: Params) => any,
  timeout: number,
): (...args: Params) => void {
  let timer: NodeJS.Timeout;
  return (...args: Params) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, timeout);
  };
}

export const getViewState = <Type extends ViewType>(
  type: Type,
  state?: Partial<DeckWrappedOpts["initialViewState"]>,
): Type extends "orthographic" ? OrthographicViewState : MapViewState => {
  if (type === "orthographic") {
    const initialViewState: OrthographicViewState = {
      target: state?.["target"] ?? [1, 1, 0],
      zoom: state?.["zoom"] ?? 0,
    };
    return initialViewState as any;
  }

  const initialViewState: MapViewState = {
    latitude: state?.["latitude"] ?? 0,
    longitude: state?.["longitude"] ?? 51,
    zoom: typeof state?.["zoom"] === "number" ? state["zoom"] : 0,
    ...(state && pickKeys(state as any, ["bearing", "pitch", "extent"], true)),
  };
  return initialViewState as any;
};

type ViewType = DeckWrappedOpts["type"];
type GetViewsResult<T extends ViewType> = {
  views: T extends "orthographic" ? OrthographicView[] : MapView[];
  initialViewState: T extends "orthographic" ? OrthographicViewState
  : MapViewState;
};

const getViews = <T extends ViewType>({
  type,
  initialViewState: ivs,
  lib,
}: {
  type: T;
  lib: DeckGlLib;
  initialViewState: OrthographicViewState | MapViewState | undefined;
}): GetViewsResult<T> => {
  if (type === "orthographic") {
    const views = [
      new lib.OrthographicView({
        id: "2d-scene",
        controller: true,
        flipY: false,
      }),
    ];

    const initialViewState = getViewState(type, ivs);
    return { views, initialViewState } as GetViewsResult<T>;
  }

  const initialViewState = getViewState(type, ivs);
  const views = [new lib.MapView({})];
  return { views, initialViewState } as GetViewsResult<T>;
};
